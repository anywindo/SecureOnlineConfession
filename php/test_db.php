<?php
declare(strict_types=1);

header('Content-Type: application/json');

require __DIR__ . '/db.php';

try {
    $pdo = get_pdo();
    $statement = $pdo->query('SELECT DATABASE() AS db_name, NOW() AS server_time');
    $row = $statement->fetch();

    echo json_encode([
        'status' => 'ok',
        'database' => $row['db_name'] ?? null,
        'server_time' => $row['server_time'] ?? null,
    ]);
} catch (Throwable $throwable) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $throwable->getMessage(),
    ]);
}
