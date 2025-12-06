## Confession Feature Rework Plan

### Goals
- Deliver a reliable real-time chat experience between penitents and priests.
- Keep the existing aesthetic while modernizing UX flows.
- Ensure data integrity and traceability for every message.

### Phase 1 – Architecture Audit (Completed)
#### 1. Schema Review
- **confessions**
  - Stores one row per session initiated by a penitent.
  - Fields: `sender_id` (penitent FK), `recipient_id` (priest FK, nullable), subject/follow_up, `resolved` flag, AES payload (`iv`, `ciphertext`), SHA-256 `message_hash`, RSA `signature`.
  - Legacy reply columns (`reply_ciphertext`, `reply_iv`, `reply_at`) still present; new system mirrors replies in `confession_messages`.
  - Index coverage: PK on `id`, secondary indexes on `sender_id` and `recipient_id`. No composite index on `(recipient_id, resolved)` yet (potential optimization).
- **confession_messages**
  - Chat log table with FK to confessions and users.
  - Fields: `sender_role` enum, AES payload, optional signature (only populated for penitents), `message_hash`.
  - Indexes on `confession_id` and `sender_id`; uses cascade delete when parent confession removed.
  - No explicit chronological index besides `created_at`, but default PK order suffices.
- **users**
  - Contains login + cryptographic material (public key + encrypted private key).
  - Simple indexes: PK on `id`, unique `username`.
- **Gaps**
  - No audit columns (`updated_at`) to detect edits.
  - No direct mapping between subjects and multiple sessions; relies on new confession row per subject.
  - No migration to backfill historical priest replies into `confession_messages`.

#### 2. API Surface Inventory
- `php/api/confessions.php`
  - GET: returns `{ success, stats {total, awaiting, replied}, threads: [...] }`.
    - Thread object: ids, partner meta, `resolved`, `needs_reply`, `last_message` (sender role, timestamp, preview text computed server-side).
    - Query filtered by session role (penitent sees own submissions, priest sees assigned confessions).
  - POST: penitent submits new confession; encrypts message, signs hash, inserts into `confessions`, now immediately calls `persist_confession_message`.
  - **Issues**: stats rely on `needsReply` logic tied to decrypted message roles; still uses legacy `resolved` flag only.
- `php/api/thread.php`
  - GET by `id`: validates access (must be sender or recipient), fetches base confession row, decrypts initial message, merges with `confession_messages`, emits `thread` metadata and `messages` array sorted chronologically.
  - Status derived from `resolved` flag + last sender role; includes `can_send`.
- `php/api/thread_message.php`
  - POST: accepts `{confession_id, message, resolve}`.
  - Validates access, blocks if `resolved=1`, persists message (with penitent signature when applicable), toggles `resolved` if requested.
  - Returns `{success, message, resolved}`; no payload of new message.
- `php/api/reply.php` (legacy priest reply)
  - Still writes to `confessions.reply_*` columns, but now also calls `persist_confession_message`.
  - Restricted to priests; JSON body with `reply_id`, `reply_message`, `end_confession`.
- Supporting endpoints: `delete_all.php` (admin only), `session.php` (auth context), `priests.php` (populate dropdown), `db_manager.php` (maintenance).

#### 3. Frontend Touchpoints
- `confession.html`
  - Layout:
    - Penitent-only submission card `#confess-section`.
    - Priest stats grid `#stats-section`.
    - Shared chat card containing `.chat-sidebar` (thread list) and `.chat-panel` (messages, composer). Currently always rendered but JS hides certain sections based on role.
  - Modal components removed; now single-page chat.
- `styles.css`
  - Contains chat-specific styles (`.chat-sidebar`, `.thread-bar`, `.status-pill`, `.chat-messages`, `.chat-message` variants).
  - Legacy classes `.forum-thread`, `.confession-list` still defined but unused by new UI.
- `js/confession.js`
  - Handles authentication gating via `session.php`.
  - Maintains state for threads, messages, active selection, debug flag.
  - Calls `confessions.php` for summary, `thread.php` for detail, `thread_message.php` for send; still includes logic referencing old DOM (e.g., `confessionList` placeholder).
  - Current bug: UI initialization tries to manipulate `#confess-section` even when not present, causing errors; thread rendering suppressed when state fails to load.

### Phase 2 – Backend Refactor
1. **Normalize storage** ✅
   - `persist_confession_message()` now re-fetches the inserted row and returns a normalized payload; callers (confession submit, messaging, legacy reply) all use it so every exchange lives in `confession_messages`.
   - Added `php/scripts/backfill_confession_messages.php` to migrate historic rows (creates initial penitent message + legacy priest reply when missing).
2. **Thread summaries endpoint** ✅
   - `confessions.php` now emits structured thread cards: status (`open/closed/awaiting_*`), partner metadata, message counts via `count_confession_messages()`, last message preview, and viewer-specific awaiting flag. Stats now include `total`, `open`, `closed`, `awaiting`.
3. **Thread detail endpoint** ✅
   - `thread.php` reuses `determine_thread_status()` and `count_confession_messages()` to return consistent metadata plus normalized messages (id, sender, text, audit flags).
4. **Messaging endpoint** ✅
   - `thread_message.php` responds with the newly stored message record, keeps signature support, and still honors resolve toggles so the frontend can append optimistically.
5. **Error contract** ➡️ partially done; remaining cleanup (shared helper) deferred to later pass once frontend consumes the new structure.

### Phase 3 – Frontend Rebuild
1. **Markup layout** ✅ – existing `confession.html` now keeps the penitent form separate from the shared chat card; priests always render the sidebar + chat pane regardless of role.
2. **State model** ✅ – `js/confession.js` rewritten from scratch: central `state` object tracks `threads`, `messages` (Map), `activeThreadId`, `session`, and `debugMode`. Removed legacy DOM references.
3. **Rendering** ✅ – modular renderers for thread list (`threadListItem`), chat header (`renderActiveThread`), and messages (`renderMessages`) with empty/loading handling and status pills matching backend statuses.
4. **Event flows** ✅ – unified fetch helpers call `confessions.php`, `thread.php`, `thread_message.php`; selection, refresh, send, resolve, and delete-all actions now re-use shared utilities, append optimistic messages, and re-load summaries.
5. **Accessibility & UX** ✅ – composer disabled while sending, closed-state banner toggles automatically, lists update highlight state, and debug toggle reveals signature badges without breaking layout.

### Phase 4 – Styling & UX Polish
1. **Palette reuse** – kept the heritage colors/fonts and extended `styles.css` with chat-specific selectors (`.thread-partner`, refined status pills) while preserving the parchment aesthetic.
2. **Responsive/UX tweaks** – chat messages now animate in (`fadeIn`), the closed-session banner toggles via `aria-hidden`, composer inputs adopt minimum heights, and the scroll container uses smooth behavior.
3. **Feedback cues** – send button shows a wait state via `data-loading`, composer disables inputs while messages send, and new CSS ensures breadcrumbs/partner text read cleanly. Sidebar awaiting threads get clearer emphasis.

### Phase 5 – Verification
1. **API sanity checks** (manual via browser or `curl`, since XAMPP runs on port 40):
   - `GET http://localhost:40/SecureOnlineConfession/php/api/confessions.php` after login as priest/user to confirm `threads` + `stats` structure.
   - `GET http://localhost:40/SecureOnlineConfession/php/api/thread.php?id={confession_id}` to ensure message arrays and status fields line up with expectations.
   - `POST http://localhost:40/SecureOnlineConfession/php/api/thread_message.php` with JSON payload to confirm it returns the appended message + resolved flag.
2. **Manual scenarios** (performed via browser at `http://localhost:40/SecureOnlineConfession/confession.html`):
   - **Penitent flow**: log in as a user, submit a new confession, verify it appears in the sidebar immediately, send a follow-up message, toggle resolve checkbox to close the session. Confirm the composer disappears and the banner shows guidance.
   - **Priest flow**: log in as a priest, load the dashboard, confirm the new session appears with “Awaiting priest” status, open it, reply, and optionally resolve. Ensure stats update (Awaiting decrements, Closed increments), and that the penitent sees the reply/closed state when they refresh.
   - **Restarted subject**: after a session is resolved, penitent submits a new confession with a different subject and the priest sees a fresh thread entry (no cross-over with the closed session).
3. **Regression sweep**:
   - Toggle “Show cryptographic debug data” to ensure signature badges render without breaking layout.
   - Use the “Delete All Confessions” admin control (priest only) to confirm the UI empties gracefully.
   - Hit `http://localhost:40/SecureOnlineConfession/php/scripts/backfill_confession_messages.php` via CLI before deploying to ensure historical data populates the chat log (one-time task).

### Deliverables
- Updated schema/migration scripts.
- Refactored PHP endpoints with consistent JSON contracts.
- Rewritten `confession.html`, `js/confession.js`, `styles.css` supporting the chat UX.
- Documentation snippet outlining new API responses and UI behavior.
