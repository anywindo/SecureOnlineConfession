<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

echo json_encode([
    'authenticated' => isset($_SESSION['user_id']),
    'username' => $_SESSION['username'] ?? null,
    'role' => $_SESSION['role'] ?? null,
    'full_name' => $_SESSION['full_name'] ?? null,
]);
