<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

echo json_encode([
    'authenticated' => isset($_SESSION['user_id']),
    'user_id' => isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null,
    'username' => $_SESSION['username'] ?? null,
    'role' => $_SESSION['role'] ?? null,
    'full_name' => $_SESSION['full_name'] ?? null,
]);
