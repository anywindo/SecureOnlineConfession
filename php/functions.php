<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$randSeedFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'php_openssl_rnd';
if (!file_exists($randSeedFile)) {
    file_put_contents($randSeedFile, random_bytes(1024));
}
putenv('RANDFILE=' . $randSeedFile);

/**
 * Locates the valid OpenSSL configuration file.
 */
function get_openssl_config_path(): ?string
{
    $envConf = getenv('OPENSSL_CONF');
    if ($envConf && file_exists($envConf)) {
        return $envConf;
    }

    $candidatePaths = [
        'C:\xampp\apache\bin\openssl.cnf', // Common XAMPP location
        'C:\xampp\apache\conf\openssl.cnf',
        'C:\xampp\php\extras\ssl\openssl.cnf',
        '/Applications/XAMPP/xamppfiles/etc/openssl.cnf',
        '/etc/ssl/openssl.cnf',
        '/usr/lib/ssl/openssl.cnf',
    ];

    foreach ($candidatePaths as $path) {
        if (file_exists($path)) {
            return $path;
        }
    }

    return null;
}

// Initialize environment
if ($conf = get_openssl_config_path()) {
    putenv('OPENSSL_CONF=' . $conf);
}

const RSA_KEY_BITS = 2048;

/**
 * Generates an RSA key pair.
 *
 * @return array{private_key:string, public_key:string}
 */
function generate_rsa_keys(): array
{
    $config = [
        'private_key_bits' => RSA_KEY_BITS,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ];

    if ($confPath = get_openssl_config_path()) {
        $config['config'] = $confPath;
    }

    $resource = openssl_pkey_new($config);

    if ($resource === false) {
        throw new RuntimeException('Failed to generate RSA key pair: ' . openssl_error_string());
    }

    $privateKey = '';
    if (!openssl_pkey_export($resource, $privateKey, null, $config)) {
        throw new RuntimeException('Failed to export private key: ' . openssl_error_string());
    }

    $details = openssl_pkey_get_details($resource);
    if ($details === false || empty($details['key'])) {
        throw new RuntimeException('Failed to get public key: ' . openssl_error_string());
    }

    return [
        'private_key' => $privateKey,
        'public_key' => $details['key'],
    ];
}

/**
 * Backwards compatibility for legacy helper name.
 *
 * @return array{private_key:string, public_key:string}
 */
function generate_rsa_keypair(): array
{
    return generate_rsa_keys();
}

/**
 * Encrypts plaintext with AES-256-CBC using the server AES key by default.
 *
 * @return array{iv:string,ciphertext:string} Base64-encoded output
 */
function encrypt_data(string $plaintext, ?string $key = null): array
{
    $key ??= get_global_aes_key();
    $iv = random_bytes(16);
    $ciphertext = openssl_encrypt(
        $plaintext,
        'aes-256-cbc',
        $key,
        OPENSSL_RAW_DATA,
        $iv
    );

    if ($ciphertext === false) {
        throw new RuntimeException('AES encryption failed: ' . openssl_error_string());
    }

    return [
        'iv' => base64_encode($iv),
        'ciphertext' => base64_encode($ciphertext),
    ];
}

/**
 * Backwards compatibility with the previous helper name.
 */
function aes_encrypt(string $plaintext, string $key): array
{
    return encrypt_data($plaintext, $key);
}

/**
 * Decrypts ciphertext produced by encrypt_data.
 */
function decrypt_data(string $ciphertextB64, string $ivB64, ?string $key = null): string
{
    $key ??= get_global_aes_key();
    $iv = base64_decode($ivB64, true);
    $ciphertext = base64_decode($ciphertextB64, true);

    if ($iv === false || $ciphertext === false) {
        throw new RuntimeException('Invalid AES payload encoding.');
    }

    $plaintext = openssl_decrypt(
        $ciphertext,
        'aes-256-cbc',
        $key,
        OPENSSL_RAW_DATA,
        $iv
    );

    if ($plaintext === false) {
        throw new RuntimeException('AES decryption failed: ' . openssl_error_string());
    }
    return $plaintext;
}

/**
 * Backwards compatibility.
 */
function aes_decrypt(string $ciphertextB64, string $ivB64, string $key): string
{
    return decrypt_data($ciphertextB64, $ivB64, $key);
}

/**
 * Encrypts a PEM private key using the global AES key.
 */
function encrypt_private_key(string $privateKeyPem): string
{
    $payload = encrypt_data($privateKeyPem);
    return json_encode($payload, JSON_THROW_ON_ERROR);
}

/**
 * Decrypts an encrypted private key payload.
 */
function decrypt_private_key(string $encrypted): string
{
    $payload = json_decode($encrypted, true, flags: JSON_THROW_ON_ERROR);

    if (!is_array($payload) || empty($payload['iv']) || empty($payload['ciphertext'])) {
        throw new RuntimeException('Invalid encrypted private key payload.');
    }

    return decrypt_data($payload['ciphertext'], $payload['iv']);
}

/**
 * Computes a SHA-256 hash of the provided message in hexadecimal form.
 */
function compute_message_hash(string $message): string
{
    return hash('sha256', $message);
}

/**
 * Produces an RSA signature (base64) over the provided message hash.
 */
function sign_data(string $hashHex, string $privateKeyPem): string
{
    $privateKey = openssl_pkey_get_private($privateKeyPem);
    if ($privateKey === false) {
        throw new RuntimeException('Invalid private key supplied for signing.');
    }

    $signature = '';
    $result = openssl_sign($hashHex, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    openssl_free_key($privateKey);

    if ($result === false) {
        $errors = [];
        while ($msg = openssl_error_string()) {
            $errors[] = $msg;
        }
        $details = $errors ? implode(' | ', $errors) : 'Unknown OpenSSL error';
        throw new RuntimeException('Failed to sign hash: ' . $details);
    }

    return base64_encode($signature);
}

/**
 * Legacy alias retained for earlier phases.
 */
function sign_hash(string $hashHex, string $privateKeyPem): string
{
    return sign_data($hashHex, $privateKeyPem);
}

/**
 * Verifies an RSA signature produced by sign_hash.
 */
function verify_signature(string $hashHex, string $signatureB64, string $publicKeyPem): bool
{
    $signature = base64_decode($signatureB64, true);
    if ($signature === false) {
        return false;
    }

    $publicKey = openssl_pkey_get_public($publicKeyPem);
    if ($publicKey === false) {
        return false;
    }

    $result = openssl_verify($hashHex, $signature, $publicKey, OPENSSL_ALGO_SHA256);
    openssl_free_key($publicKey);

    return $result === 1;
}

/**
 * Helper dedicated to encrypting priest replies for clarity/logging.
 */
function encrypt_reply(string $replyPlaintext): array
{
    return encrypt_data($replyPlaintext);
}

function ensure_confession_messages_schema(PDO $pdo): void
{
    static $initialized = false;
    if ($initialized) {
        return;
    }

    $result = $pdo->query("SHOW TABLES LIKE 'confession_messages'");
    if ($result === false || !$result->fetch()) {
        $pdo->exec(
            "CREATE TABLE confession_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                confession_id INT NOT NULL,
                sender_id INT NOT NULL,
                sender_role ENUM('user','priest') NOT NULL,
                iv VARCHAR(255) NOT NULL,
                ciphertext LONGTEXT NOT NULL,
                message_hash CHAR(64) NOT NULL,
                signature LONGTEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_confession_messages_confession (confession_id),
                INDEX idx_confession_messages_sender (sender_id),
                CONSTRAINT fk_messages_confession FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE,
                CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    $initialized = true;
}

function persist_confession_message(PDO $pdo, int $confessionId, int $senderId, string $senderRole, string $plaintext, ?string $signature = null): array
{
    ensure_confession_messages_schema($pdo);

    $payload = encrypt_data($plaintext);
    $hash = compute_message_hash($plaintext);
    $role = $senderRole === 'priest' ? 'priest' : 'user';

    $stmt = $pdo->prepare(
        'INSERT INTO confession_messages (confession_id, sender_id, sender_role, iv, ciphertext, message_hash, signature)
         VALUES (:confession_id, :sender_id, :sender_role, :iv, :ciphertext, :message_hash, :signature)'
    );

    $stmt->execute([
        'confession_id' => $confessionId,
        'sender_id' => $senderId,
        'sender_role' => $role,
        'iv' => $payload['iv'],
        'ciphertext' => $payload['ciphertext'],
        'message_hash' => $hash,
        'signature' => $signature,
    ]);

    $messageId = (int) $pdo->lastInsertId();
    $select = $pdo->prepare(
        'SELECT cm.*, u.username, u.full_name, u.public_key
         FROM confession_messages cm
         JOIN users u ON cm.sender_id = u.id
         WHERE cm.id = :id'
    );
    $select->execute(['id' => $messageId]);
    $row = $select->fetch();

    return normalize_confession_message_row($row);
}

function build_initial_confession_message(array $row): array
{
    $plaintext = decrypt_data($row['ciphertext'], $row['iv']);
    $hash = compute_message_hash($plaintext);
    $signatureValid = verify_signature($hash, $row['signature'], $row['public_key']);

    return [
        'id' => 'confession-' . $row['id'],
        'sender_role' => 'user',
        'sender_id' => (int) $row['sender_id'],
        'sender_name' => $row['sender_full_name'] ?? $row['username'],
        'created_at' => $row['created_at'],
        'plaintext' => $plaintext,
        'signature_valid' => $signatureValid,
        'is_initial' => true,
        'is_legacy' => false,
    ];
}

function build_legacy_priest_reply(array $row): ?array
{
    if (empty($row['reply_ciphertext']) || empty($row['reply_iv'])) {
        return null;
    }

    $plaintext = decrypt_data($row['reply_ciphertext'], $row['reply_iv']);

    return [
        'id' => 'legacy-reply-' . $row['id'],
        'sender_role' => 'priest',
        'sender_id' => isset($row['recipient_id']) ? (int) $row['recipient_id'] : 0,
        'sender_name' => $row['recipient_full_name'] ?? 'Priest',
        'created_at' => $row['reply_at'] ?? $row['created_at'],
        'plaintext' => $plaintext,
        'signature_valid' => null,
        'is_initial' => false,
        'is_legacy' => true,
    ];
}

function normalize_confession_message_row(array $row): array
{
    $plaintext = decrypt_data($row['ciphertext'], $row['iv']);
    $signatureValid = null;
    if (!empty($row['signature']) && !empty($row['public_key'])) {
        $signatureValid = verify_signature($row['message_hash'], $row['signature'], $row['public_key']);
    }

    return [
        'id' => (int) $row['id'],
        'sender_role' => $row['sender_role'] === 'priest' ? 'priest' : 'user',
        'sender_id' => (int) $row['sender_id'],
        'sender_name' => $row['full_name'] ?: $row['username'],
        'created_at' => $row['created_at'],
        'plaintext' => $plaintext,
        'text' => $plaintext,
        'signature_valid' => $signatureValid,
        'is_initial' => false,
        'is_legacy' => false,
    ];
}

function count_confession_messages(PDO $pdo, int $confessionId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) AS total FROM confession_messages WHERE confession_id = :id');
    $stmt->execute(['id' => $confessionId]);
    $row = $stmt->fetch();
    return (int) ($row['total'] ?? 0);
}

function determine_thread_status(array $confessionRow, array $lastMessage): string
{
    if (!empty($confessionRow['resolved'])) {
        return 'closed';
    }

    return $lastMessage['sender_role'] === 'user' ? 'awaiting_priest' : 'awaiting_penitent';
}

function fetch_confession_messages(PDO $pdo, array $confessionRow): array
{
    ensure_confession_messages_schema($pdo);

    $messages = [build_initial_confession_message($confessionRow)];
    $legacy = build_legacy_priest_reply($confessionRow);
    if ($legacy) {
        $messages[] = $legacy;
    }

    $stmt = $pdo->prepare(
        'SELECT cm.*, u.username, u.full_name, u.public_key
         FROM confession_messages cm
         JOIN users u ON cm.sender_id = u.id
         WHERE cm.confession_id = :confession_id
         ORDER BY cm.created_at ASC, cm.id ASC'
    );
    $stmt->execute(['confession_id' => (int) $confessionRow['id']]);

    $rows = $stmt->fetchAll();
    foreach ($rows as $row) {
        $messages[] = normalize_confession_message_row($row);
    }

    usort($messages, static function (array $a, array $b): int {
        return strtotime($a['created_at']) <=> strtotime($b['created_at']);
    });

    return $messages;
}

function fetch_latest_confession_message(PDO $pdo, array $confessionRow): array
{
    $latest = build_initial_confession_message($confessionRow);

    $legacy = build_legacy_priest_reply($confessionRow);
    if ($legacy && strtotime($legacy['created_at']) >= strtotime($latest['created_at'])) {
        $latest = $legacy;
    }

    ensure_confession_messages_schema($pdo);
    $stmt = $pdo->prepare(
        'SELECT cm.*, u.username, u.full_name, u.public_key
         FROM confession_messages cm
         JOIN users u ON cm.sender_id = u.id
         WHERE cm.confession_id = :confession_id
         ORDER BY cm.created_at DESC, cm.id DESC
         LIMIT 1'
    );
    $stmt->execute(['confession_id' => (int) $confessionRow['id']]);
    $row = $stmt->fetch();

    if ($row) {
        $candidate = normalize_confession_message_row($row);
        if (strtotime($candidate['created_at']) >= strtotime($latest['created_at'])) {
            $latest = $candidate;
        }
    }

    return $latest;
}
function fetch_chat_thread(PDO $pdo, int $threadId, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM chat_threads
         WHERE id = :id
           AND (penitent_id = :penitent_match OR priest_id = :priest_match)
         LIMIT 1'
    );
    $stmt->execute([
        'id' => $threadId,
        'penitent_match' => $userId,
        'priest_match' => $userId,
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}
