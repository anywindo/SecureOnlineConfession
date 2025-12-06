<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$userIds = [];

if (isset($_GET['user_ids'])) {
    $param = $_GET['user_ids'];
    if (is_array($param)) {
        $userIds = array_map('intval', $param);
    } else {
        $split = array_map('trim', explode(',', (string)$param));
        $userIds = array_map('intval', $split);
    }
} elseif (!empty($_GET['user_id'])) {
    $userIds = [(int)$_GET['user_id']];
}

$userIds = array_values(array_unique(array_filter($userIds, static fn ($id) => $id > 0)));

if (empty($userIds)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id is required.']);
    exit;
}

try {
    $pdo = get_pdo();
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT ck.user_id, ck.public_key, ck.updated_at, u.full_name, u.username
         FROM chat_keys ck
         JOIN users u ON ck.user_id = u.id
         WHERE ck.user_id IN ($placeholders)"
    );
    $stmt->execute($userIds);
    $rows = $stmt->fetchAll();

    $keys = array_map(static function ($row): array {
        return [
            'user_id' => (int)$row['user_id'],
            'public_key' => $row['public_key'],
            'full_name' => $row['full_name'] ?: $row['username'],
            'updated_at' => $row['updated_at'],
        ];
    }, $rows);

    echo json_encode(['success' => true, 'keys' => $keys]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch public keys.']);
}
