<?php
declare(strict_types=1);

/**
 * Lightweight smoke test for the confession workflow.
 *
 * Steps:
 *  1. Create temporary priest + penitent accounts.
 *  2. Register chat keys for both users.
 *  3. Create a chat thread and exchange two encrypted messages.
 *  4. Assert the expected counts via SELECT queries.
 *  5. Roll back the transaction so the database stays clean.
 */

error_reporting(E_ALL);

require __DIR__ . '/../php/db.php';

$log = [];
$pdo = null;
function note(string $message): void
{
    global $log;
    $log[] = '[' . date('Y-m-d H:i:s') . "] $message";
}

try {
    $pdo = get_pdo();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    note('Connected to database: ' . ($pdo->query('SELECT DATABASE()')->fetchColumn() ?: 'unknown'));

    $pdo->beginTransaction();
    note('Transaction opened (changes will be rolled back).');

    $fakeKey = function (string $label): string {
        return "-----BEGIN PUBLIC KEY-----\n" .
            chunk_split(strtoupper(bin2hex(random_bytes(32))), 64, "\n") .
            "-----END PUBLIC KEY-----\n";
    };

    $password = password_hash('SmokeTest#' . random_int(1000, 9999), PASSWORD_BCRYPT);

    $createUser = $pdo->prepare("
        INSERT INTO users (username, full_name, password_hash, role, public_key, encrypted_private_key)
        VALUES (:username, :full_name, :password_hash, :role, :public_key, :encrypted_private_key)
    ");

    $priestUsername = 'smoke_priest_' . uniqid();
    $penitentUsername = 'smoke_penitent_' . uniqid();

    $createUser->execute([
        ':username' => $priestUsername,
        ':full_name' => 'Smoke Test Priest',
        ':password_hash' => $password,
        ':role' => 'priest',
        ':public_key' => $fakeKey('priest'),
        ':encrypted_private_key' => base64_encode(random_bytes(64)),
    ]);
    $priestId = (int)$pdo->lastInsertId();
    note("Inserted priest user #$priestId.");

    $createUser->execute([
        ':username' => $penitentUsername,
        ':full_name' => 'Smoke Test Penitent',
        ':password_hash' => $password,
        ':role' => 'user',
        ':public_key' => $fakeKey('penitent'),
        ':encrypted_private_key' => base64_encode(random_bytes(64)),
    ]);
    $penitentId = (int)$pdo->lastInsertId();
    note("Inserted penitent user #$penitentId.");

    $insertKey = $pdo->prepare("INSERT INTO chat_keys (user_id, public_key) VALUES (:user_id, :public_key)");
    $insertKey->execute([
        ':user_id' => $priestId,
        ':public_key' => bin2hex(random_bytes(65))
    ]);
    $insertKey->execute([
        ':user_id' => $penitentId,
        ':public_key' => bin2hex(random_bytes(65))
    ]);
    note('Registered chat keys for both users.');

    $createThread = $pdo->prepare("
        INSERT INTO chat_threads (penitent_id, priest_id, subject, resolved)
        VALUES (:penitent_id, :priest_id, :subject, 0)
    ");
    $createThread->execute([
        ':penitent_id' => $penitentId,
        ':priest_id' => $priestId,
        ':subject' => 'Smoke Test Session',
    ]);
    $threadId = (int)$pdo->lastInsertId();
    note("Created chat thread #$threadId.");

    $insertMessage = $pdo->prepare("
        INSERT INTO chat_messages (thread_id, sender_id, sender_public_key, recipient_public_key, ciphertext_b64)
        VALUES (:thread_id, :sender_id, :sender_public_key, :recipient_public_key, :ciphertext_b64)
    ");

    $cipherSample = function (string $label): string {
        return base64_encode($label . ':' . bin2hex(random_bytes(16)));
    };

    $insertMessage->execute([
        ':thread_id' => $threadId,
        ':sender_id' => $penitentId,
        ':sender_public_key' => bin2hex(random_bytes(65)),
        ':recipient_public_key' => bin2hex(random_bytes(65)),
        ':ciphertext_b64' => $cipherSample('penitent'),
    ]);
    $insertMessage->execute([
        ':thread_id' => $threadId,
        ':sender_id' => $priestId,
        ':sender_public_key' => bin2hex(random_bytes(65)),
        ':recipient_public_key' => bin2hex(random_bytes(65)),
        ':ciphertext_b64' => $cipherSample('priest'),
    ]);
    note('Inserted two encrypted chat messages.');

    $threadCount = (int)$pdo->query("SELECT COUNT(*) FROM chat_threads WHERE id = $threadId")->fetchColumn();
    $messageCount = (int)$pdo->query("SELECT COUNT(*) FROM chat_messages WHERE thread_id = $threadId")->fetchColumn();
    $keyCount = (int)$pdo->query("SELECT COUNT(*) FROM chat_keys WHERE user_id IN ($priestId, $penitentId)")->fetchColumn();

    if ($threadCount !== 1 || $messageCount !== 2 || $keyCount !== 2) {
        throw new RuntimeException('Verification failed: unexpected counts detected.');
    }
    note('Verification queries returned expected counts.');

    $pdo->rollBack();
    note('Transaction rolled back. Database restored to previous state.');

    echo implode(PHP_EOL, $log) . PHP_EOL;
} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $log[] = 'ERROR: ' . $e->getMessage();
    echo implode(PHP_EOL, $log) . PHP_EOL;
    exit(1);
}
