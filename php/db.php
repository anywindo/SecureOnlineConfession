<?php
declare(strict_types=1);

/**
 * Global configuration for database access and the AES-256 key that encrypts user private keys.
 * Update the credentials/key for production deployments.
 */
const DB_HOST = 'localhost';
const DB_NAME = 'db_kripto_confession';
const DB_USER = 'root';
const DB_PASS = '';

// 32-byte (256-bit) key encoded in base64; regenerate and store securely for production use.
const GLOBAL_AES_KEY_B64 = 'ObW0HnRQeBCF7TG7pVhUf1x1kXQBn2siJPQBAonb5N0=';

// Toggle to auto-create a demo priest account for quick testing (credentials defined below).
const ENABLE_DEMO_PRIEST_SEED = false;
const DEMO_PRIEST_USERNAME = 'priest_admin';
const DEMO_PRIEST_PASSWORD = 'Peace!123';

/**
 * Returns a shared PDO connection instance.
 */
function get_pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        DB_HOST,
        DB_NAME
    );

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        maybe_seed_demo_priest($pdo);
    } catch (PDOException $exception) {
        // Do not exit, throw exception so API can handle it
        throw new RuntimeException('Database connection failed: ' . $exception->getMessage());
    }

    return $pdo;
}

/**
 * Returns the binary representation of the global AES key.
 */
function get_global_aes_key(): string
{
    $key = base64_decode(GLOBAL_AES_KEY_B64, true);

    if ($key === false || strlen($key) !== 32) {
        throw new RuntimeException('Invalid global AES key configuration.');
    }

    return $key;
}

/**
 * Returns the current logged-in user array (id, username, role) or null.
 */
function current_user(): ?array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return null;
    }

    if (!isset($_SESSION['user_id'], $_SESSION['username'], $_SESSION['role'])) {
        return null;
    }

    return [
        'id' => (int)$_SESSION['user_id'],
        'username' => (string)$_SESSION['username'],
        'role' => (string)$_SESSION['role'],
    ];
}

/**
 * Seeds a demo priest account when ENABLE_DEMO_PRIEST_SEED is true.
 */
function maybe_seed_demo_priest(PDO $pdo): void
{
    if (!ENABLE_DEMO_PRIEST_SEED) {
        return;
    }

    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username');
    $stmt->execute(['username' => DEMO_PRIEST_USERNAME]);

    if ($stmt->fetch()) {
        return;
    }

    require_once __DIR__ . '/functions.php';

    $keys = generate_rsa_keypair();
    $encryptedKey = encrypt_private_key($keys['private_key']);

    $insert = $pdo->prepare(
        'INSERT INTO users (username, password_hash, role, public_key, encrypted_private_key)
         VALUES (:username, :password_hash, :role, :public_key, :encrypted_private_key)'
    );

    $insert->execute([
        'username' => DEMO_PRIEST_USERNAME,
        'password_hash' => password_hash(DEMO_PRIEST_PASSWORD, PASSWORD_BCRYPT),
        'role' => 'priest',
        'public_key' => $keys['public_key'],
        'encrypted_private_key' => $encryptedKey,
    ]);
}
