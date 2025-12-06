<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/functions.php';

const PRIEST_INVITE_CODE = 'HOLY-ACCESS';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$fullName = trim($_POST['full_name'] ?? '');
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$confirmPassword = $_POST['confirm_password'] ?? '';
$role = $_POST['role'] ?? 'user';
$priestCode = trim($_POST['priest_code'] ?? '');

$errors = [];

if ($fullName === '') {
    $errors[] = 'Full name is required.';
}

if ($username === '') {
    $errors[] = 'Username is required.';
}

if ($password === '') {
    $errors[] = 'Password is required.';
} elseif (strlen($password) < 8) {
    $errors[] = 'Password must be at least 8 characters.';
}

if ($password !== $confirmPassword) {
    $errors[] = 'Password confirmation does not match.';
}

if (!in_array($role, ['user', 'priest'], true)) {
    $errors[] = 'Invalid role selection.';
}

if ($role === 'priest' && $priestCode !== PRIEST_INVITE_CODE) {
    $errors[] = 'Priest invite code is invalid.';
}

if (!empty($errors)) {
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

try {
    $pdo = get_pdo();

    $existing = $pdo->prepare('SELECT id FROM users WHERE username = :username');
    $existing->execute(['username' => $username]);

    if ($existing->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Username already exists.']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $keypair = generate_rsa_keys();
    $encryptedPrivateKey = encrypt_private_key($keypair['private_key']);

    $insert = $pdo->prepare(
        'INSERT INTO users (username, full_name, password_hash, role, public_key, encrypted_private_key)
         VALUES (:username, :full_name, :password_hash, :role, :public_key, :encrypted_private_key)'
    );

    $insert->execute([
        'username' => $username,
        'full_name' => $fullName,
        'password_hash' => $passwordHash,
        'role' => $role,
        'public_key' => $keypair['public_key'],
        'encrypted_private_key' => $encryptedPrivateKey,
    ]);

    echo json_encode(['success' => true, 'message' => 'Registration successful. Please log in.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
