<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required.']);
    exit;
}

$pdo = get_pdo();
$userId = (int)$_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT username, full_name, role FROM users WHERE id = :id');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => $user,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$fullName = isset($payload['full_name']) ? trim((string)$payload['full_name']) : null;
$newPassword = (string)($payload['new_password'] ?? '');
$confirmPassword = (string)($payload['confirm_password'] ?? '');

$updates = [];
$params = ['id' => $userId];
$messages = [];

if ($fullName !== null) {
    if ($fullName === '') {
        $messages[] = 'Full name cannot be empty.';
    } else {
        $updates[] = 'full_name = :full_name';
        $params['full_name'] = $fullName;
    }
}

if ($newPassword !== '' || $confirmPassword !== '') {
    if ($newPassword === '' || $confirmPassword === '') {
        $messages[] = 'Both password fields are required.';
    } elseif ($newPassword !== $confirmPassword) {
        $messages[] = 'Password confirmation does not match.';
    } elseif (strlen($newPassword) < 8) {
        $messages[] = 'Password must be at least 8 characters.';
    } else {
        $updates[] = 'password_hash = :password_hash';
        $params['password_hash'] = password_hash($newPassword, PASSWORD_BCRYPT);
    }
}

if (!empty($messages)) {
    echo json_encode(['success' => false, 'message' => implode(' ', $messages)]);
    exit;
}

if (empty($updates)) {
    echo json_encode(['success' => false, 'message' => 'No changes detected.']);
    exit;
}

$sql = sprintf('UPDATE users SET %s WHERE id = :id', implode(', ', $updates));
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

if (isset($params['full_name'])) {
    $_SESSION['full_name'] = $params['full_name'];
}

echo json_encode(['success' => true, 'message' => 'Profile updated successfully.']);
