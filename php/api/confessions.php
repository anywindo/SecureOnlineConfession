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
    $message = trim($_POST['message'] ?? '');
    $subject = trim($_POST['subject'] ?? '');
    $replyHint = trim($_POST['reply_hint'] ?? '');
    $endFlag = isset($_POST['end_confession']) ? 1 : 0;
    if ($message === '') {
        echo json_encode(['success' => false, 'message' => 'Message cannot be empty.']);
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
            echo json_encode(['success' => false, 'message' => 'Please select a priest to receive your confession.']);
            exit;
        }

        $recipientStmt = $pdo->prepare("SELECT id FROM users WHERE id = :id AND role = 'priest'");
        $recipientStmt->execute(['id' => $recipientId]);
        if (!$recipientStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Invalid priest selection.']);
            exit;
        }

        $userStmt = $pdo->prepare('SELECT encrypted_private_key FROM users WHERE id = :id');
        $userStmt->execute(['id' => $userId]);
        $userRow = $userStmt->fetch();

        if (!$userRow) {
            throw new RuntimeException('User not found.');
        }

        $privateKey = decrypt_private_key($userRow['encrypted_private_key']);
        $messageHash = compute_message_hash($message);
        $signature = sign_data($messageHash, $privateKey);
        $cipherPayload = encrypt_data($message);

        $insert = $pdo->prepare(
            'INSERT INTO confessions (sender_id, recipient_id, subject, follow_up, resolved, iv, ciphertext, message_hash, signature)
             VALUES (:sender_id, :recipient_id, :subject, :follow_up, :resolved, :iv, :ciphertext, :message_hash, :signature)'
        );

        $insert->execute([
            'sender_id' => $userId,
            'recipient_id' => $recipientId,
            'subject' => $subject,
            'follow_up' => $replyHint,
            'resolved' => $endFlag,
            'iv' => $cipherPayload['iv'],
            'ciphertext' => $cipherPayload['ciphertext'],
            'message_hash' => $messageHash,
            'signature' => $signature,
        ]);

        echo json_encode(['success' => true, 'message' => 'Confession submitted securely.']);
    } catch (Throwable $exception) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save confession: ' . $exception->getMessage()]);
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
        $plaintext = decrypt_data($row['ciphertext'], $row['iv']);

        return [
            'id' => (int)$row['id'],
            'username' => $row['username'],
            'full_name' => $row['sender_full_name'] ?? $row['username'],
            'created_at' => $row['created_at'],
            'plaintext' => $plaintext,
            'signature_valid' => verify_signature($row['message_hash'], $row['signature'], $row['public_key']),
            'reply_text' => $row['reply_ciphertext'] && $row['reply_iv'] ? decrypt_data($row['reply_ciphertext'], $row['reply_iv']) : null,
            'reply_at' => $row['reply_at'],
            'recipient_name' => $row['recipient_full_name'],
            'recipient_id' => (int)$row['recipient_id'],
            'subject' => $row['subject'],
            'follow_up' => $row['follow_up'],
            'resolved' => (bool)$row['resolved'],
            'message_hash' => $row['message_hash'],
            'iv' => $row['iv'],
            'signature_preview' => substr($row['signature'], 0, 60) . '...',
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
    echo json_encode(['success' => false, 'message' => 'Failed to load confessions.']);
}
