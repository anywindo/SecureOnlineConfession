<?php
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    fwrite(STDERR, "This script must be run from the command line.\n");
    exit(1);
}

require_once __DIR__ . '/../db.php';

try {
    $pdo = get_pdo();
    $pdo->exec('DROP TABLE IF EXISTS confession_messages');
    $pdo->exec('DROP TABLE IF EXISTS confessions');
    fwrite(STDOUT, "Legacy confession tables dropped successfully.\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Failed to drop legacy tables: " . $e->getMessage() . "\n");
    exit(1);
}
