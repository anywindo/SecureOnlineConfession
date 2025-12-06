<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../functions.php';
require_once __DIR__ . '/../../db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload) || !array_key_exists('public_key', $payload)) {
    $payload = $_POST;
}
$publicKey = trim($payload['public_key'] ?? '');

if ($publicKey === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Public key is required.']);
    exit;
}

try {
    $pdo = get_pdo();
    $stmt = $pdo->prepare('INSERT INTO chat_keys (user_id, public_key, updated_at) VALUES (:user_id, :public_key, NOW())
        ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), updated_at = NOW()');
    $stmt->execute([
        'user_id' => (int)$_SESSION['user_id'],
        'public_key' => $publicKey,
    ]);

    echo json_encode(['success' => true, 'message' => 'Public key registered.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to register key.']);
}
