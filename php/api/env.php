<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';

try {
    $pdo = get_pdo();
    $mysqlVersion = $pdo->query('SELECT VERSION() AS version')->fetch()['version'] ?? 'unknown';
} catch (Throwable $th) {
    $mysqlVersion = 'error';
}

$info = phpversion();
$server = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';

// XAMPP version isn't directly available; expose placeholder field
$response = [
    'php' => $info,
    'mysql' => $mysqlVersion,
    'server' => $server,
    'xampp' => $_ENV['XAMPP_VERSION'] ?? 'manual',
];

echo json_encode(['success' => true, 'env' => $response]);
