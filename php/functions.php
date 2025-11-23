<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$randSeedFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'php_openssl_rnd';
if (!file_exists($randSeedFile)) {
    file_put_contents($randSeedFile, random_bytes(1024));
}
putenv('RANDFILE=' . $randSeedFile);

if (!getenv('OPENSSL_CONF')) {
    $candidatePaths = [
        '/Applications/XAMPP/xamppfiles/etc/openssl.cnf',
        '/etc/ssl/openssl.cnf',
        '/usr/lib/ssl/openssl.cnf',
    ];

    foreach ($candidatePaths as $path) {
        if (file_exists($path)) {
            putenv('OPENSSL_CONF=' . $path);
            break;
        }
    }
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

    $resource = openssl_pkey_new($config);

    if ($resource === false) {
        throw new RuntimeException('Failed to generate RSA key pair: ' . openssl_error_string());
    }

    $privateKey = '';
    if (!openssl_pkey_export($resource, $privateKey)) {
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
