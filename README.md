# Secure Online Confession Booth

PHP 8.2 / MySQL demo app that showcases the four foundational cryptography services (authentication, confidentiality, integrity, and non-repudiation) through a secure confession workflow.

## Tech Stack & Layout
- Native PHP + PDO + OpenSSL (`php/db.php`, `php/functions.php`).
- Entry points (all inside `/php`): `index.php` (login), `register.php`, `dashboard.php`, `logout.php`.
- Schema + sample tooling: `db_kripto_confession.sql`, `test_db.php`, `tests/workflow_smoke.php`.
- Styles: `styles.css`.

## Setup
1. Start MySQL from XAMPP and create the schema:
   ```bash
   mysql -h 127.0.0.1 -u root < db_kripto_confession.sql
   ```
   For existing databases, run the incremental migration to add role/reply columns:
   ```bash
   mysql -h 127.0.0.1 -u root < db_kripto_confession.sql
   ```
2. Adjust credentials or the global AES key in `db.php` if your environment differs.
3. Place this project inside `htdocs/project` (already structured) and access via `http://localhost/project/php/index.php`.

## Usage Flow
1. Visit `php/register.php`, provide your full name, choose Penitent or Priest, enter credentials — RSA-2048 keys are generated on the fly, the private key is wrapped with the server AES key, and metadata (including role + assigned priest) is stored in `users`.
2. Log in via `php/index.php`; sessions keep track of user id, username, and role.
3. Penitents submit confessions with a subject, optional follow-up note, and a “resolve conversation” flag:
   - Plaintext is AES-256-CBC encrypted (ciphertext + IV stored).
   - SHA-256 hash and RSA signature (private key) are saved alongside the ciphertext.
4. Penitents must choose a priest; priests (`confession.html` dashboard) see only their assigned entries, validate signatures, and respond; replies are encrypted with AES and timestamped. Both parties have chat-style reply boxes plus a toggle to mark the thread “resolved”.
5. Dashboard shows role-specific views (user history vs. priest console) and highlights integrity status for each entry, including sender/recipient full names.
6. `php/logout.php` clears the session and leaves a role-aware farewell banner.

## Cryptographic Pillars
| Pillar | Implementation |
| --- | --- |
| Authentication | `register.php` + `index.php` with `password_hash()` / `password_verify()` and PHP sessions. |
| Confidentiality | AES-256-CBC helpers in `functions.php`, invoked from `dashboard.php` (ciphertext + IV stored). |
| Integrity | SHA-256 hashes (`compute_message_hash`) stored per confession, revalidated on display. |
| Non-repudiation | RSA signatures via `sign_data`/`verify_signature`; public keys in DB, private keys encrypted at rest. |

## Testing & Verification
- **DB Probe:** `php php/test_db.php` returns current DB + server time.
- **Automated Workflow Smoke:** `php tests/workflow_smoke.php` registers a temporary penitent and priest, creates a confession, encrypts a reply, verifies hashes/signatures, and cleans up.
- **Manual Verification Checklist:**
  1. Register a Penitent and a Priest (invite code `HOLY-ACCESS`), then log in as the Penitent and submit a confession.
  2. Log out, log back in as the Priest, review the entry, confirm the “Signature Valid” badge, and send an encrypted reply.
  3. Log in again as the Penitent to view the decrypted reply.
  4. Tamper test: in MySQL, modify `ciphertext` or `signature` for the confession, refresh the dashboard, and confirm the badge flips to “Signature Invalid”.
  5. Capture screenshots of each step for inclusion in `Kripto_<nama kelompok>.pdf`.

## Deployment & Operations

### 1. Schema Migration
Run the full schema when provisioning a fresh database:
```bash
mysql -h 127.0.0.1 -u root < db_kripto_confession.sql
```
For existing deployments, at minimum execute the latest incremental change (recipient public keys for chat messages):
```bash
ALTER TABLE chat_messages
    ADD COLUMN recipient_public_key TEXT NULL AFTER sender_public_key;
```
Apply any future snippets from `db_kripto_confession.sql` in order, and always back up the database before applying SQL changes.

### 2. Front-end Assets
The front-end uses plain ES modules plus CDN-delivered CryptoJS/elliptic, so there is no webpack build step. After pulling updates, clear the browser cache or force reload (`Cmd+Shift+R`) to ensure the new `js/confession.js` and `js/chat-crypto.js` are loaded.

### 3. Key Management Instructions
1. **On first login**, users must open `confession.html`, expand the “advanced” panel, and click “Generate Secure Key.” This silently creates an ECDH key pair, stores it in `localStorage`, and registers the public key via `php/api/chat/register_key.php`.
2. **Key rotation:** use the same button to regenerate when the device changes or if a key compromise is suspected. The debug toggle shows whether a key is present.
3. **Multi-device note:** keys are local per browser. Each device must generate and register its own key; otherwise messages from that device cannot be decrypted later.
4. **Troubleshooting:** if messages show “Unable to decrypt,” clear the debug panel to verify both users have keys registered (the panel lists partner key previews). Re-generate keys if necessary and resend messages; newly sent messages will include the correct partner key metadata.

## Packaging
Generate the submission archive from `/Applications/XAMPP/xamppfiles/htdocs`:
```bash
zip -r project/Kripto_Welsa.zip project -x project/Kripto_Welsa.zip
```
This produces `Kripto_Group.zip` containing all PHP sources plus `schema.sql` for upload. A PDF report (`Kripto_<nama kelompok>.pdf`) should reference this repository and include screenshots of the verification steps above.
