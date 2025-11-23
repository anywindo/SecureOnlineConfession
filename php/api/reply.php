<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../functions.php';

if (!isset($_SESSION['user_id'], $_SESSION['role']) || $_SESSION['role'] !== 'priest') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$replyId = (int)($input['reply_id'] ?? 0);
$replyText = trim($input['reply_message'] ?? '');
$endFlag = !empty($input['end_confession']);

if ($replyId <= 0 || $replyText === '') {
    echo json_encode(['success' => false, 'message' => 'Invalid input.']);
    exit;
}

try {
    $pdo = get_pdo();
    $payload = encrypt_reply($replyText);

    $update = $pdo->prepare(
        'UPDATE confessions
         SET reply_ciphertext = :ciphertext, reply_iv = :iv, reply_at = NOW(), resolved = :resolved
         WHERE id = :id'
    );
    $update->execute([
        'ciphertext' => $payload['ciphertext'],
        'iv' => $payload['iv'],
        'resolved' => $endFlag ? 1 : 0,
        'id' => $replyId,
    ]);

    echo json_encode(['success' => true, 'message' => 'Reply delivered with confidentiality.']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
