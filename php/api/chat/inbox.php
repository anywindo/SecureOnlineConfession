<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../functions.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$userId = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'SELECT m.*, t.penitent_id, t.priest_id, u.full_name
         FROM chat_messages m
         JOIN chat_threads t ON m.thread_id = t.id
         JOIN users u ON m.sender_id = u.id
         WHERE ((t.penitent_id = :penitent_match AND t.priest_id != :priest_exclude)
             OR (t.priest_id = :priest_match AND t.penitent_id != :penitent_exclude))
           AND m.sender_id != :sender_exclude
           AND m.read_at IS NULL
         ORDER BY m.created_at ASC'
    );
    $stmt->execute([
        'penitent_match' => $userId,
        'priest_exclude' => $userId,
        'priest_match' => $userId,
        'penitent_exclude' => $userId,
        'sender_exclude' => $userId,
    ]);
    $messages = $stmt->fetchAll();

    $ids = array_column($messages, 'id');
    if ($ids) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $update = $pdo->prepare("UPDATE chat_messages SET read_at = NOW() WHERE id IN ($placeholders)");
        $update->execute($ids);
    }

    $payload = array_map(static function ($row): array {
        return [
            'id' => (int)$row['id'],
            'thread_id' => (int)$row['thread_id'],
            'sender_id' => (int)$row['sender_id'],
            'sender_name' => $row['full_name'],
            'ciphertext_b64' => $row['ciphertext_b64'],
            'sender_public_key' => $row['sender_public_key'],
            'created_at' => $row['created_at'],
        ];
    }, $messages);

    echo json_encode(['success' => true, 'messages' => $payload]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch inbox.']);
}
