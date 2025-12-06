<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($username === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

try {
    $pdo = get_pdo();
    $statement = $pdo->prepare('SELECT id, full_name, password_hash, role, encrypted_private_key, salt FROM users WHERE username = :username');
    $statement->execute(['username' => $username]);
    $user = $statement->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
        exit;
    }

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $username;
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['role'] = $user['role'];
    // E2EE: Return stored keys to client
    $_SESSION['encrypted_private_key'] = $user['encrypted_private_key'];
    $_SESSION['salt'] = $user['salt'];

    echo json_encode([
        'success' => true, 
        'message' => 'Login successful',
        'encrypted_private_key' => $user['encrypted_private_key'],
        'salt' => $user['salt']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
