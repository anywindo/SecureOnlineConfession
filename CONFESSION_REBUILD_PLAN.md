## Confession Rebuild Plan (ECDH-Based Chat)

> Legacy `/example/chat` assets were fully analyzed and have now been removed from the repository; references below remain only as historical context for the rebuilt architecture.

### 1. Lessons from `example/chat/frontend/index-ecdh.html`
- The demo relies on **client-side ECDH** (elliptic `p256`) to derive a shared secret with the recipient’s public key, hashes it (SHA-256) into an AES key, and encrypts plaintext with a random IV (`CryptoJS.AES.encrypt`).
- Every message payload stores the sender name, recipient name, sender public key, and the IV + ciphertext in Base64 (`chatmessages` table).
- Registration simply stores the user’s latest ECDH public key (`chatkeys` table); private keys live in `sessionStorage`.
- Retrieval decrypts by recomputing the shared secret using the stored private key and the sender’s published public key.
- Backend endpoints are minimal JSON POST/GET handlers:
  - `register.php` upserts `{username, public_key}`.
  - `simpan_pesan.php` inserts `{asal, tujuan, kunci, pesan}` into `chatmessages`.
  - `baca_pesan.php` fetches unread rows for a recipient, marks them read.

### 2. Database Reiteration (Comparison)

| Current (`db_kripto_confession.sql`) | Proposed (ECDH Chat) | Notes |
| --- | --- | --- |
| `users` – auth, RSA keys, roles | `users` (reuse) | Base identities stay the same. |
| `confessions` – one row per submission with ciphertext, signature, legacy priest reply columns | `chat_threads` – represents a session between a penitent and priest (`penitent_id`, `priest_id`, `subject`, `resolved`, timestamps) | Threads replace monolithic confessions; `resolved` flag moves here. |
| *none* | `chat_keys` – stores latest ECDH public key per user (`user_id`, `public_key`, `updated_at`) | Needed to derive shared secrets like the example. |
| `confession_messages` – encrypted payloads tied to `confessions`, mixed user/priest rows, RSA-based structure | `chat_messages` – encrypted blobs per thread with sender metadata (`thread_id`, `sender_id`, `sender_public_key`, `ciphertext_b64`, `created_at`, `read_at`) | Switches to ECDH-derived AES ciphertext, keeps sender key per message. |

Additional tables (optional):
- `chat_users` view/table if we want to denormalize penitent/priest metadata for threads.

Key differences:
- Messages no longer embed decrypted plaintext server-side; all payloads remain encrypted (`ciphertext_b64`).
- Public-key rotation tracked per user via `chat_keys`, whereas current system relies on RSA keys stored alongside users.
- Stats and filters operate on `chat_threads` instead of decrypting `confessions` rows.

### 3. Backend Endpoints (PHP)
1. **`php/api/chat/register_key.php`**
   - Input: `{ public_key }`.
   - Auth: existing session (penitent or priest).
   - Action: upsert into `chat_keys`.
2. **`php/api/chat/threads.php`**
   - GET: returns threads filtered by role (`penitent_id` or `priest_id`), including last message meta and resolved state.
   - POST: penitent creates a new thread (`subject`, `priest_id`); also inserts first message by calling `messages.php`.
3. **`php/api/chat/messages.php`**
   - POST: `{ thread_id, ciphertext_b64, sender_public_key, resolve }`.
   - Validates that sender participates in thread, stores ciphertext, toggles `resolved` if requested, updates `updated_at`.
   - Response includes message metadata for optimistic UI.
   - GET (optional): `?thread_id=...` returns chronological list of encrypted payloads for that thread (so frontend decrypts locally).
4. **`php/api/chat/inbox.php`** (optional convenience)
   - GET unread messages across all threads for current user (similar to `baca_pesan.php`), mark them read.
5. **Utilities**
   - Shared helper to enforce role access.
   - Migration script to populate `chat_threads` / `chat_messages` if legacy data needs to be ported.

### 4. Frontend Rebuild Outline
1. **Key Management (client-side)**
   - On login, check `localStorage`/`sessionStorage` for `ecdh_private`/`ecdh_public`.
   - Provide “Generate Secure Key” CTA (mirrors `daftar()` in the example) that uses `elliptic` + `CryptoJS` to create a new pair, saves locally, and POSTs the public key to `register_key.php`.
2. **Thread List UI**
   - Similar to current `confession.html` layout: sidebar lists threads showing subject, partner, last updated, status.
   - “New confession” modal for penitents to select priest & subject.
3. **Message Composer**
   - On send:
     1. Fetch recipient’s latest public key (`chat_keys`).
     2. Derive AES key with local private key (like `kirimPesan()`).
     3. Encrypt plaintext, send to `chat/messages.php`.
4. **Message Viewer**
   - Fetch encrypted messages via `GET chat/messages.php?thread_id=...`.
   - For each entry, derive shared secret using sender’s public key from the payload and decrypt like `lihatPesan()`.
   - Show warnings if decryption fails (signature optional).
5. **Unread/Status Handling**
   - Use `read_at` to style unread bubbles; update via an additional `PATCH` endpoint or when `GET` occurs.
6. **Libraries/Assets**
   - Include `CryptoJS` and `elliptic` in `confession.html`.
   - Bundle helper JS (key generation, encryption/decryption) into `js/chat-crypto.js`.

### 5. Implementation Phases (Detailed)

#### Phase 0 – Preparation
- Confirm dev server (XAMPP port 40) is ready; back up current DB.
- Review `/example/chat` flow with stakeholders to align expectations.
- Make the SQL table alteration for confession table and tell user to execute it

#### Phase 1 – Schema & Data Layer
1. Create new tables (`chat_keys`, `chat_threads`, `chat_messages`) with constraints:
   - `chat_keys (id, user_id FK, public_key, updated_at)`
   - `chat_threads (id, penitent_id FK, priest_id FK, subject, resolved, created_at, updated_at)`
   - `chat_messages (id, thread_id FK, sender_id FK, sender_public_key, ciphertext_b64, created_at, read_at)`
2. Add indexes for performance (e.g., `chat_threads(priest_id, resolved)`, `chat_messages(thread_id, created_at)`).
3. Optional CLI script to seed `chat_keys` (prompt users to generate ECDH keys on first login if not seeded).

✅ *Status:* Implemented in `db_kripto_confession.sql` (tables, indexes, foreign keys). Ready for migration.

#### Phase 2 – Backend API Layer
1. Build RESTful endpoints under `php/api/chat/`:
   - `register_key.php` – upsert latest ECDH public key for logged-in user.
   - `threads.php` – GET list filtered by role; POST creates new thread (penitent only).
   - `messages.php` – POST encrypted payloads (and optional resolve flag); GET returns encrypted history for a thread.
   - `inbox.php` (optional) – GET unread messages for quick polling.
2. Add shared helpers for JSON responses, auth checks, and role validation.
3. Test each endpoint via `curl`/Postman with sample payloads (simulate both roles).

✅ *Status:* Completed – endpoints are in place with auth guards, typographical bugs resolved (`register_key.php` include path, `inbox.php` prepared statement execution), and CLI smoke tests cover key registration, thread creation, encrypted message send/resolution, and inbox reads.

#### Phase 3 – Crypto Utilities & Key UX
1. Include `CryptoJS` + `elliptic` in `confession.html`.
2. Create `js/chat-crypto.js` (or similar) exposing:
   - `generateKeyPair()`, `storeKeys()`, `loadKeys()`
   - `encryptMessage(plaintext, recipientPubKey)` and `decryptMessage(entry)`
3. Add UI affordance to generate/regenerate keys (mirroring `daftar()` behavior) and auto-register via `register_key.php`.

#### Phase 4 – Chat UI Integration
1. Hook the **existing** `confession.html` layout into the new APIs without redesigning the page chrome:
   - Use the current sidebar/list cards and populate them via `chat/threads.php` or if you want to redesign, make sure it follows the style of `style.css`.
   - Keep the current “Write a Confession” form styling; just wire it to POST `/chat/threads.php` and initial message send. or if you want to redesign, make sure it follows the style of `style.css`
2. Message composer:
   - Before sending, fetch recipient public key, derive AES key, encrypt client-side, POST to `messages.php`.
3. Message viewer:
   - Fetch encrypted history, decrypt per entry, render bubbles; handle failures gracefully.
4. State management:
   - Maintain stats/unread badges within the current visual components (header, cards, banners) so the standardized theme remains untouched while leveraging the new crypto helpers.

#### Phase 5 – QA & Hardening
1. Manual test matrix:
   - Penitent creates new thread, sends messages, resolves conversation. ✅
   - Priest sees awaiting threads, replies, closes.
   - Key rotation scenario (user regenerates keys) to ensure flows recover. 
2. Validate unread handling (`read_at`), error states (missing keys, decryption failure), and access controls.
3. Document deployment steps: schema migration, JS/CSS build, key management instructions for users.

This plan uses the `example/chat` logic as the reference implementation while scaling it up for the confession feature (threads, roles, and UI). Once the DB and API layers are rebuilt, the frontend can directly mirror the example’s workflow with the updated markup in `confession.html`.
