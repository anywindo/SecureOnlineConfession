<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../functions.php';

if (!isset($_SESSION['user_id'], $_SESSION['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthenticated']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$role = $_SESSION['role'];

try {
    $pdo = get_pdo();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $query = $role === 'priest'
            ? 'SELECT t.*, u.full_name AS penitent_name, p.full_name AS priest_name
                FROM chat_threads t
                JOIN users u ON t.penitent_id = u.id
                JOIN users p ON t.priest_id = p.id
                WHERE t.priest_id = :userId
                ORDER BY t.updated_at DESC'
            : 'SELECT t.*, u.full_name AS penitent_name, p.full_name AS priest_name
                FROM chat_threads t
                JOIN users u ON t.penitent_id = u.id
                JOIN users p ON t.priest_id = p.id
                WHERE t.penitent_id = :userId
                ORDER BY t.updated_at DESC';

        $stmt = $pdo->prepare($query);
        $stmt->execute(['userId' => $userId]);
        $threads = array_map(static function ($row) use ($role): array {
            $partnerName = $role === 'priest' ? $row['penitent_name'] : $row['priest_name'];
            return [
                'id' => (int)$row['id'],
                'subject' => $row['subject'],
                'resolved' => (bool)$row['resolved'],
                'status' => $row['resolved'] ? 'closed' : 'open',
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
                'partner' => [
                    'id' => $role === 'priest' ? (int)$row['penitent_id'] : (int)$row['priest_id'],
                    'name' => $partnerName,
                    'role' => $role === 'priest' ? 'penitent' : 'priest',
                ],
            ];
        }, $stmt->fetchAll());

        echo json_encode(['success' => true, 'threads' => $threads]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($role !== 'user') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only penitents can create threads.']);
            exit;
        }

        $subject = trim($_POST['subject'] ?? '');
        $priestId = (int)($_POST['priest_id'] ?? 0);

        if ($subject === '' || !$priestId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Subject and priest are required.']);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO chat_threads (penitent_id, priest_id, subject)
            VALUES (:penitent_id, :priest_id, :subject)');
        $stmt->execute([
            'penitent_id' => $userId,
            'priest_id' => $priestId,
            'subject' => $subject,
        ]);

        echo json_encode(['success' => true, 'thread_id' => (int)$pdo->lastInsertId()]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to process request.']);
}
