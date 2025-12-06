<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../functions.php';

if (!isset($_SESSION['user_id'], $_SESSION['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$userId = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $threadId = (int)($_GET['thread_id'] ?? 0);
        if ($threadId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'thread_id is required.']);
            exit;
        }

        $thread = fetch_chat_thread($pdo, $threadId, $userId);
        if (!$thread) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Thread not found.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT m.*, u.full_name FROM chat_messages m JOIN users u ON m.sender_id = u.id WHERE m.thread_id = :thread_id ORDER BY m.created_at ASC');
        $stmt->execute(['thread_id' => $threadId]);
        $messages = array_map(static function ($row): array {
            return [
                'id' => (int)$row['id'],
                'sender_id' => (int)$row['sender_id'],
                'sender_name' => $row['full_name'],
                'sender_public_key' => $row['sender_public_key'],
                'recipient_public_key' => $row['recipient_public_key'],
                'ciphertext_b64' => $row['ciphertext_b64'],
                'created_at' => $row['created_at'],
                'read_at' => $row['read_at'],
            ];
        }, $stmt->fetchAll());

        echo json_encode(['success' => true, 'messages' => $messages]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody, true);
        if (!is_array($payload) || !array_key_exists('thread_id', $payload)) {
            $payload = $_POST;
        }
        $threadId = (int)($payload['thread_id'] ?? 0);
        $ciphertext = trim($payload['ciphertext_b64'] ?? '');
        $senderPublicKey = trim($payload['sender_public_key'] ?? '');
        $recipientPublicKey = trim($payload['recipient_public_key'] ?? '');
        $resolve = !empty($payload['resolve']);

        if ($threadId <= 0 || $ciphertext === '' || $senderPublicKey === '' || $recipientPublicKey === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
            exit;
        }

        $thread = fetch_chat_thread($pdo, $threadId, $userId);
        if (!$thread) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Thread not found.']);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO chat_messages (thread_id, sender_id, sender_public_key, recipient_public_key, ciphertext_b64)
            VALUES (:thread_id, :sender_id, :sender_public_key, :recipient_public_key, :ciphertext_b64)');
        $stmt->execute([
            'thread_id' => $threadId,
            'sender_id' => $userId,
            'sender_public_key' => $senderPublicKey,
            'recipient_public_key' => $recipientPublicKey,
            'ciphertext_b64' => $ciphertext,
        ]);
        $messageId = (int)$pdo->lastInsertId();

        if ($resolve) {
            $update = $pdo->prepare('UPDATE chat_threads SET resolved = 1, updated_at = NOW() WHERE id = :id');
            $update->execute(['id' => $threadId]);
        } else {
            $bump = $pdo->prepare('UPDATE chat_threads SET updated_at = NOW() WHERE id = :id');
            $bump->execute(['id' => $threadId]);
        }

        echo json_encode([
            'success' => true,
            'message_id' => $messageId,
            'resolved' => $resolve,
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    if (function_exists('error_log')) {
        error_log('chat/messages error: ' . $e->getMessage());
    }
    echo json_encode(['success' => false, 'message' => 'Failed to process request.']);
}
