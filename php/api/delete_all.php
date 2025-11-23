<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';

// Ensure only authenticated priests can access this
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

try {
    $pdo = get_pdo();
    // Delete all records from the confessions table
    $stmt = $pdo->prepare('DELETE FROM confessions');
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'All confessions have been deleted.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
