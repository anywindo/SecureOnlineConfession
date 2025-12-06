<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../functions.php';

if (!isset($_SESSION['user_id'], $_SESSION['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$pdo = get_pdo();
$userId = (int)$_SESSION['user_id'];
$role = $_SESSION['role'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // E2EE: We expect 'ciphertext' (JSON blob), 'signature' (B64 PSS), 'iv' (metadata or part of blob)
    $ciphertext = $_POST['ciphertext'] ?? ''; // JSON String { iv, msg, key }
    $signature = $_POST['signature'] ?? '';
    // We can ignore 'message' and 'subject' plaintext if we want, OR keep subject plaintext for UI?
    // Plan says "Subject" is plaintext in SQL schema? Yes to allow listing.
    // Client should send Subject plaintext + Encrypted Message.
    $subject = trim($_POST['subject'] ?? ''); 
    $replyHint = trim($_POST['reply_hint'] ?? ''); // This might be sensitive? Let's assume plaintext for now or client encrypts it.
    
    // For now, let's strictly require ciphertext
    if ($ciphertext === '' || $signature === '') {
        echo json_encode(['success' => false, 'message' => 'Cryptographic payload missing.']);
        exit;
    }

    if ($role !== 'user') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only penitents can submit confessions.']);
        exit;
    }

    try {
        $recipientId = isset($_POST['recipient_id']) ? (int)$_POST['recipient_id'] : null;
        if (!$recipientId) {
            echo json_encode(['success' => false, 'message' => 'Please select a priest.']);
            exit;
        }

        // 1. Verify Sender Signature
        $userStmt = $pdo->prepare('SELECT public_key FROM users WHERE id = :id');
        $userStmt->execute(['id' => $userId]);
        $userRow = $userStmt->fetch();
        
        $pubKeys = json_decode($userRow['public_key'], true);
        if (!$pubKeys || !isset($pubKeys['sign'])) {
             throw new Exception("Sender has no registered signing key.");
        }
        
        $signKeyB64 = $pubKeys['sign'];
        $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split($signKeyB64, 64) . "-----END PUBLIC KEY-----";
        
        // Verify signature of the Ciphertext (Blob)
        // Client signs the data sent as 'ciphertext'
        // $ciphertext is the JSON string
        $valid = openssl_verify($ciphertext, base64_decode($signature), $pem, OPENSSL_ALGO_SHA256);
        
        if ($valid !== 1) {
             throw new Exception("Signature verification failed. Message integrity compromised.");
        }

        $messageHash = hash('sha256', $ciphertext);

        $insert = $pdo->prepare(
            'INSERT INTO confessions (sender_id, recipient_id, subject, follow_up, resolved, iv, ciphertext, message_hash, signature)
             VALUES (:sender_id, :recipient_id, :subject, :follow_up, 0, :iv, :ciphertext, :message_hash, :signature)'
        );

        $insert->execute([
            'sender_id' => $userId,
            'recipient_id' => $recipientId,
            'subject' => $subject, // Plaintext subject
            'follow_up' => $replyHint,
            'iv' => 'json', // It's in the blob
            'ciphertext' => $ciphertext,
            'message_hash' => $messageHash,
            'signature' => $signature,
        ]);

        echo json_encode(['success' => true, 'message' => 'Confession submitted securely.']);
    } catch (Throwable $exception) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $exception->getMessage()]);
    }

    exit;
}

try {
    $query = $role === 'priest'
        ? 'SELECT c.*, u.username, u.full_name AS sender_full_name, u.public_key, rp.full_name AS recipient_full_name
            FROM confessions c
            JOIN users u ON c.sender_id = u.id
            LEFT JOIN users rp ON c.recipient_id = rp.id
            WHERE c.recipient_id = :user_id
            ORDER BY c.created_at DESC'
        : 'SELECT c.*, u.username, u.full_name AS sender_full_name, u.public_key, rp.full_name AS recipient_full_name
            FROM confessions c
            JOIN users u ON c.sender_id = u.id
            LEFT JOIN users rp ON c.recipient_id = rp.id
            WHERE c.sender_id = :user_id
            ORDER BY c.created_at DESC';

    $stmt = $pdo->prepare($query);
    $stmt->execute(['user_id' => $userId]);
    $rows = $stmt->fetchAll();

    $confessions = array_map(function ($row) {
        // Verification Logic
        $isValid = false;
        try {
            $pubKeys = json_decode($row['public_key'], true);
            if ($pubKeys && isset($pubKeys['sign'])) {
                $signKeyB64 = $pubKeys['sign'];
                $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split($signKeyB64, 64) . "-----END PUBLIC KEY-----";
                // Verify signature of the Ciphertext (Blob)
                $isValid = openssl_verify($row['ciphertext'], base64_decode($row['signature']), $pem, OPENSSL_ALGO_SHA256) === 1;
            }
        } catch (Exception $e) {
            // Ignore verification error in listing for now, let it be false
        }

        return [
            'id' => (int)$row['id'],
            'username' => $row['username'],
            'full_name' => $row['sender_full_name'] ?? $row['username'],
            'created_at' => $row['created_at'],
            // Client must decrypt
            'ciphertext' => $row['ciphertext'], 
            'plaintext' => null, // Deprecated, client handles it
            'signature_valid' => $isValid,
            // Replies are broken for now unless we update reply.php, but let's pass them through
            'reply_text' => null, // Placeholder 'row[reply_ciphertext]' eventually
            'reply_at' => $row['reply_at'],
            'recipient_name' => $row['recipient_full_name'],
            'recipient_id' => (int)$row['recipient_id'],
            'subject' => $row['subject'],
            'follow_up' => $row['follow_up'],
            'resolved' => (bool)$row['resolved'],
            'message_hash' => $row['message_hash'],
            'iv' => $row['iv'],
            'signature_preview' => substr($row['signature'], 0, 10) . '...',
        ];
    }, $rows);

    echo json_encode([
        'success' => true,
        'stats' => [
            'total' => count($rows),
            'awaiting' => count(array_filter($rows, fn($r) => empty($r['reply_ciphertext']))),
            'replied' => count(array_filter($rows, fn($r) => !empty($r['reply_ciphertext']))),
        ],
        'confessions' => $confessions,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load confessions: ' . $exception->getMessage()]);
}
