<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');

try {
    $pdo = get_pdo();
    $stmt = $pdo->query("SELECT id, username, full_name, public_key FROM users WHERE role = 'priest' ORDER BY full_name, username");
    $priests = $stmt->fetchAll();
    echo json_encode($priests);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([]);
}
