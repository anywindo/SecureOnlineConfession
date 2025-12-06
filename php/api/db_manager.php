<?php
session_start();
require_once '../db.php';
$pdo = get_pdo();

header('Content-Type: application/json');

// Security Check: Must be logged in and have 'priest' role OR provide secret code
$secret_code = $_POST['secret_code'] ?? '';
if (($secret_code !== 'admin') && (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'priest')) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$action = $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'fetch_schema':
            $tables = ['users', 'chat_threads', 'chat_messages', 'chat_keys'];
            $schema = [];
            foreach ($tables as $table) {
                $stmt = $pdo->query("DESCRIBE `$table`");
                $columns = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $columns[] = [
                        'name' => $row['Field'],
                        'type' => $row['Type'],
                        'key' => $row['Key'],
                    ];
                }
                $schema[] = ['name' => $table, 'columns' => $columns];
            }
            echo json_encode(['success' => true, 'tables' => $schema]);
            break;

        case 'fetch_data':
            $table = $_POST['table'] ?? '';
    // Whitelist tables to prevent SQL injection via table name
    $allowed_tables = ['users', 'chat_threads', 'chat_messages', 'chat_keys'];
            
            if (!in_array($table, $allowed_tables)) {
                throw new Exception("Invalid table name.");
            }

            $stmt = $pdo->prepare("SELECT * FROM `$table` ORDER BY id DESC LIMIT 100");
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'delete_row':
            $table = $_POST['table'] ?? '';
            $id = $_POST['id'] ?? 0;
            
            $allowed_tables = ['users', 'chat_threads', 'chat_messages', 'chat_keys'];
            if (!in_array($table, $allowed_tables)) {
                throw new Exception("Invalid table name.");
            }

            if (!$id) {
                throw new Exception("Invalid ID.");
            }

            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            
            echo json_encode(['success' => true, 'message' => 'Record deleted.']);
            break;

        case 'update_row':
            $table = $_POST['table'] ?? '';
            $id = $_POST['id'] ?? 0;
            $data = json_decode($_POST['data'] ?? '{}', true);

            $allowed_tables = ['users', 'chat_threads', 'chat_messages', 'chat_keys'];
            if (!in_array($table, $allowed_tables)) {
                throw new Exception("Invalid table name.");
            }

            if (!$id || empty($data)) {
                throw new Exception("Invalid ID or empty data.");
            }

            // Construct Update Query
            $fields = [];
            $values = [];
            foreach ($data as $key => $value) {
                // Basic column name validation (alphanumeric + underscore)
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) continue;
                
                $fields[] = "`$key` = ?";
                $values[] = $value;
            }

            if (empty($fields)) {
                throw new Exception("No valid fields to update.");
            }

            $values[] = $id;
            $sql = "UPDATE `$table` SET " . implode(', ', $fields) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);

            echo json_encode(['success' => true, 'message' => 'Record updated.']);
            break;

        case 'execute_sql':
            $query = $_POST['query'] ?? '';
            if (empty($query)) {
                throw new Exception("Empty query.");
            }

            // Basic safety check: prevent DROP/TRUNCATE if needed, but user requested full access.
            // We'll just execute it.
            
            $stmt = $pdo->prepare($query);
            $stmt->execute();

            // If it's a SELECT query, return data
            if (stripos(trim($query), 'SELECT') === 0) {
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $data]);
            } else {
                echo json_encode(['success' => true, 'message' => 'Query executed successfully.']);
            }
            break;

        case 'run_test':
            $test = $_POST['test'] ?? '';
            $baseDir = realpath(__DIR__ . '/../..');
            if (!$baseDir) {
                throw new Exception('Unable to resolve project root.');
            }

            $phpBin = '/Applications/XAMPP/xamppfiles/bin/php';

            if ($test === 'workflow') {
                $script = $baseDir . '/tests/workflow_smoke.php';
                if (!file_exists($script)) {
                    throw new Exception('workflow_smoke.php is missing.');
                }
                $output = shell_exec(escapeshellcmd($phpBin) . ' ' . escapeshellarg($script) . ' 2>&1');
                echo json_encode(['success' => true, 'output' => $output ?: 'No output']);
            } elseif ($test === 'db') {
                $script = $baseDir . '/php/test_db.php';
                if (!file_exists($script)) {
                    throw new Exception('test_db.php is missing.');
                }
                $output = shell_exec(escapeshellcmd($phpBin) . ' ' . escapeshellarg($script) . ' 2>&1');
                echo json_encode(['success' => true, 'output' => $output ?: 'No output']);
            } elseif ($test === 'integrity') {
                $target = $baseDir . '/php/api/chat/inbox.php';
                if (!file_exists($target)) {
                    throw new Exception('chat inbox endpoint is missing.');
                }
                $code = 'session_start(); $_SESSION["user_id"]=1; require "' . addslashes($target) . '";';
                $cmd = 'PHP_SESSION_ACTIVE=1 ' . escapeshellcmd($phpBin) . ' -r ' . escapeshellarg($code) . ' 2>&1';
                $output = shell_exec($cmd);
                echo json_encode(['success' => true, 'output' => $output ?: 'No output']);
            } else {
                throw new Exception('Unknown test');
            }
            break;

        default:
            throw new Exception("Invalid action.");
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
