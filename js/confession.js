(() => {
    const AUTO_REFRESH_DEFAULT = 10000;

    const API = {
        session: 'php/api/session.php',
        priests: 'php/api/priests.php',
        threads: 'php/api/chat/threads.php',
        messages: 'php/api/chat/messages.php',
        registerKey: 'php/api/chat/register_key.php',
        keyring: 'php/api/chat/keyring.php',
    };
    const state = {
        session: null,
        threads: [],
        messagesByThread: new Map(),
        activeThreadId: null,
        loadingThreads: false,
        keyCache: new Map(),
        debugMode: false,
        threadFilter: '',
        autoRefreshTimer: null,
        autoRefreshEnabled: false,
        autoRefreshInterval: AUTO_REFRESH_DEFAULT,
    };

    const els = {
        welcome: document.getElementById('user-welcome'),
        loginBtn: document.getElementById('login-btn'),
        usernameDisplay: document.getElementById('username-display'),
        userRoleDisplay: document.getElementById('user-role-display'),
        userNameDisplay: document.getElementById('user-name-display-main'),
        roleDescription: document.getElementById('role-description'),
        confessSection: document.getElementById('confess-section'),
        statsSection: document.getElementById('stats-section'),
        statTotal: document.getElementById('stat-total'),
        statAwaiting: document.getElementById('stat-awaiting'),
        statReplied: document.getElementById('stat-replied'),
        confessForm: document.getElementById('confess-form'),
        priestSelect: document.getElementById('priest-select'),
        threadList: document.getElementById('thread-list'),
        threadEmpty: document.getElementById('thread-empty'),
        threadSearch: document.getElementById('thread-search'),
        refreshBtn: document.getElementById('refresh-threads'),
        chatMessages: document.getElementById('chat-messages'),
        messageForm: document.getElementById('message-form'),
        messageTextarea: document.querySelector('#message-form textarea'),
        resolveCheckbox: document.querySelector('#message-form input[name="resolve"]'),
        activePartner: document.getElementById('active-partner'),
        activeSubject: document.getElementById('active-subject'),
        activeStatus: document.getElementById('active-status'),
        statusPill: document.getElementById('thread-status-pill'),
        closedBanner: document.getElementById('chat-closed-banner'),
        alertArea: document.getElementById('alert-area'),
        debugToggle: document.getElementById('debug-toggle'),
        deleteBtn: document.getElementById('delete-all-btn'),
        inspectorPartner: document.getElementById('inspector-partner'),
        inspectorSubject: document.getElementById('inspector-subject'),
        inspectorStatus: document.getElementById('inspector-status'),
        inspectorUpdated: document.getElementById('inspector-updated'),
        sessionInspector: document.getElementById('session-inspector'),
        debugPanel: document.getElementById('debug-panel'),
        debugPanelBody: document.getElementById('debug-panel-body'),
        autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
        autoRefreshInterval: document.getElementById('auto-refresh-interval'),
    };

    document.addEventListener('DOMContentLoaded', () => {
        init().catch((error) => {
            console.error(error);
            showAlert('error', 'Failed to initialize the confession portal.');
        });
    });

    async function init() {
        const session = await fetchJSON(API.session);
        if (!session?.authenticated) {
            window.location.href = 'index.html';
            return;
        }
        state.session = session;
        hydrateSessionUI();
        registerEventHandlers();

        if (session.role === 'user') {
            await populatePriests();
        }

        try {
            if (window.ChatCrypto) {
                await window.ChatCrypto.ensureKeyPair({ register: true });
            }
        } catch (error) {
            console.warn('Key bootstrap failed', error);
        }

        await loadThreads();
        const autoToggle = document.getElementById('auto-refresh-toggle');
        if (autoToggle) {
            autoToggle.checked = state.autoRefreshEnabled;
        }
        if (state.autoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    function hydrateSessionUI() {
        const { session } = state;
        if (els.welcome) els.welcome.style.display = 'inline-block';
        if (els.loginBtn) els.loginBtn.style.display = 'none';
        if (els.usernameDisplay) els.usernameDisplay.textContent = session.full_name || session.username;
        if (els.userRoleDisplay) {
            els.userRoleDisplay.textContent = session.role === 'priest' ? 'Priest Portal' : 'Penitent Portal';
        }
        if (els.userNameDisplay) {
            els.userNameDisplay.textContent = `Welcome, ${session.full_name || session.username}`;
        }
        if (els.roleDescription) {
            els.roleDescription.textContent = session.role === 'priest'
                ? 'Review every confession, validate authenticity, and provide encrypted counsel.'
                : 'Submit your confession and keep track of replies from the clergy.';
        }
        if (els.confessSection) {
            els.confessSection.style.display = session.role === 'user' ? 'block' : 'none';
        }
        if (els.statsSection) {
            els.statsSection.style.display = session.role === 'priest' ? 'grid' : 'none';
        }
        if (els.deleteBtn) {
            els.deleteBtn.style.display = session.role === 'priest' ? 'inline-block' : 'none';
        }
    }

    function registerEventHandlers() {
        if (els.debugToggle) {
            els.debugToggle.addEventListener('change', () => {
                state.debugMode = els.debugToggle.checked;
                renderActiveThread();
            });
        }

        if (els.threadSearch) {
            els.threadSearch.addEventListener('input', (event) => {
                state.threadFilter = event.target.value.trim().toLowerCase();
                renderThreadList();
            });
        }

        if (els.deleteBtn && state.session.role === 'priest') {
            els.deleteBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                if (!confirm('Delete ALL chat threads and messages? This action cannot be undone.')) {
                    return;
                }
                try {
                    await fetchJSON('php/api/delete_all.php', { method: 'POST' });
                    showAlert('success', 'All threads deleted.');
                    await loadThreads(true);
                } catch (error) {
                    showAlert('error', error.message || 'Failed to delete threads.');
                }
            });
        }

        if (els.confessForm) {
            els.confessForm.addEventListener('submit', handleConfessionSubmit);
        }

        if (els.refreshBtn) {
            els.refreshBtn.addEventListener('click', () => loadThreads(true));
        }

        window.addEventListener('beforeunload', stopAutoRefresh);

        if (els.autoRefreshToggle) {
            state.autoRefreshEnabled = els.autoRefreshToggle.checked;
            els.autoRefreshToggle.addEventListener('change', () => {
                state.autoRefreshEnabled = els.autoRefreshToggle.checked;
                if (state.autoRefreshEnabled) {
                    loadThreads(true);
                    startAutoRefresh();
                } else {
                    stopAutoRefresh();
                }
            });
        }
        if (els.autoRefreshInterval) {
            const parsedValue = Number(els.autoRefreshInterval.value);
            if (!Number.isNaN(parsedValue)) {
                state.autoRefreshInterval = parsedValue;
            }
            els.autoRefreshInterval.addEventListener('change', () => {
                const ms = Number(els.autoRefreshInterval.value);
                if (!Number.isNaN(ms) && ms > 0) {
                    state.autoRefreshInterval = ms;
                    if (state.autoRefreshEnabled) {
                        startAutoRefresh();
                    }
                }
            });
        }

        if (els.threadList) {
            els.threadList.addEventListener('click', (event) => {
                const item = event.target.closest('li[data-thread-id]');
                if (item) {
                    const threadId = Number(item.dataset.threadId);
                    selectThread(threadId);
                }
            });
        }

        if (els.messageForm) {
            els.messageForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (!state.activeThreadId) {
                    alert('Select a session first.');
                    return;
                }
                const message = els.messageTextarea.value.trim();
                if (!message) {
                    alert('Please write a message.');
                    return;
                }
                const resolve = Boolean(els.resolveCheckbox?.checked);
                setComposerDisabled(true);
                try {
                    await sendEncryptedMessage(state.activeThreadId, message, resolve);
                    els.messageTextarea.value = '';
                    if (els.resolveCheckbox) els.resolveCheckbox.checked = false;
                    await loadThreadMessages(state.activeThreadId);
                    await loadThreads();
                } catch (error) {
                    showAlert('error', error.message || 'Failed to send message.');
                } finally {
                    setComposerDisabled(false);
                }
            });
        }
    }

    async function handleConfessionSubmit(event) {
        event.preventDefault();
        if (!window.ChatCrypto) {
            showAlert('error', 'Secure chat helper not available.');
            return;
        }
        const formData = new FormData(els.confessForm);
        const subject = formData.get('subject')?.toString().trim() ?? '';
        const priestId = Number(formData.get('priest_id') || formData.get('recipient_id'));
        const message = formData.get('message')?.toString().trim() ?? '';
        if (!subject || !priestId || !message) {
            alert('Complete the form before sending.');
            return;
        }
        setFormDisabled(els.confessForm, true);
        try {
            await window.ChatCrypto.ensureKeyPair({ register: true });
            const payload = new URLSearchParams();
            payload.set('subject', subject);
            payload.set('priest_id', String(priestId));
            const response = await fetchJSON(API.threads, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString(),
            });
            if (!response?.thread_id) {
                throw new Error('Failed to create new thread.');
            }
            const threadId = Number(response.thread_id);
            await loadThreads(true);
            const createdThread = state.threads.find((t) => t.id === threadId);
            if (!createdThread) {
                throw new Error('Thread not found.');
            }
            await sendEncryptedMessage(threadId, message, false);
            els.confessForm.reset();
            showAlert('success', 'Confession sent securely.');
            await loadThreadMessages(threadId);
            selectThread(threadId);
        } catch (error) {
            showAlert('error', error.message || 'Unable to send confession.');
        } finally {
            setFormDisabled(els.confessForm, false);
        }
    }

    async function loadThreads(force = false) {
        if (state.loadingThreads && !force) {
            return;
        }
        state.loadingThreads = true;
        try {
            const result = await fetchJSON(API.threads);
            state.threads = result.threads || [];
            updateStats();
            renderThreadList();
            if (!state.activeThreadId && state.threads.length) {
                selectThread(state.threads[0].id);
            } else if (state.activeThreadId && force) {
                selectThread(state.activeThreadId);
            }
            if (state.activeThreadId && !state.threads.some((thread) => thread.id === state.activeThreadId)) {
                setActiveThread(null);
            }
            if (!state.threads.length) {
                setActiveThread(null);
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to load chat threads.');
        } finally {
            state.loadingThreads = false;
            updateDebugPanel();
        }
    }

    function renderThreadList() {
        if (!els.threadList) {
            return;
        }
        els.threadList.innerHTML = '';
        const threads = getFilteredThreads();
        if (!threads.length) {
            if (els.threadEmpty) {
                const emptyMessage = els.threadEmpty.querySelector('p');
                if (emptyMessage) {
                    emptyMessage.innerHTML = state.threadFilter
                        ? 'No sessions match your search.<br>Try another subject or partner.'
                        : 'No conversations yet.<br>Start a confession to see it here.';
                }
                els.threadEmpty.style.display = 'block';
            }
            return;
        }
        if (els.threadEmpty) {
            els.threadEmpty.style.display = 'none';
        }

        const fragment = document.createDocumentFragment();
        threads.forEach((thread) => {
            const item = document.createElement('li');
            item.className = 'thread-item';
            if (thread.id === state.activeThreadId) {
                item.classList.add('is-active');
            }
            item.dataset.threadId = String(thread.id);
            item.innerHTML = `
                <div class="thread-primary">
                    <h4>${escapeHtml(thread.subject)}</h4>
                    <p class="muted">${escapeHtml(thread.partner.name)}</p>
                </div>
                <div class="thread-meta">
                    <span class="badge ${thread.resolved ? 'badge-muted' : 'badge-live'}">
                        ${thread.resolved ? 'Closed' : 'Open'}
                    </span>
                    <small>${formatTimestamp(thread.updated_at)}</small>
                </div>
            `;
            fragment.appendChild(item);
        });
        els.threadList.appendChild(fragment);
    }

    async function selectThread(threadId) {
        if (!threadId) {
            setActiveThread(null);
            return;
        }
        const thread = state.threads.find((t) => t.id === threadId);
        if (!thread) {
            showAlert('error', 'Selected thread is no longer available.');
            setActiveThread(null);
            return;
        }
        await fetchPartnerPublicKey(thread.partner?.id || 0, { forceRefresh: true }).catch(() => {});
        state.activeThreadId = threadId;
        renderThreadList();
        await loadThreadMessages(threadId);
    }

    async function loadThreadMessages(threadId) {
        const thread = state.threads.find((t) => t.id === threadId);
        if (!thread) {
            showAlert('error', 'Thread not found.');
            return;
        }
        const partnerId = thread.partner?.id || null;
        if (partnerId) {
            await fetchPartnerPublicKey(partnerId).catch(() => {});
        }
        const partnerKey = partnerId ? getCachedPartnerKey(partnerId) : null;
        try {
            const data = await fetchJSON(`${API.messages}?thread_id=${encodeURIComponent(threadId)}`);
            const decrypted = data.messages.map((message) => {
                const base = {
                    id: message.id,
                    senderId: message.sender_id,
                    senderName: message.sender_name,
                    createdAt: message.created_at,
                    readAt: message.read_at,
                    senderPublicKey: message.sender_public_key,
                    recipientPublicKey: message.recipient_public_key,
                    ciphertext: message.ciphertext_b64,
                    isSelf: message.sender_id === state.session.user_id,
                };
                if (!window.ChatCrypto) {
                    return { ...base, plaintext: '[Crypto unavailable]', decryptError: true };
                }
                const candidates = message.isSelf
                    ? [message.recipient_public_key, partnerKey, message.sender_public_key]
                    : [message.sender_public_key, partnerKey, message.recipient_public_key];
                const result = tryDecryptWithCandidates(message.ciphertext_b64, candidates);
                if (result.success) {
                    return {
                        ...base,
                        plaintext: result.plaintext,
                        decryptError: false,
                        decryptKeyPreview: result.keyPreview,
                    };
                }
                return {
                    ...base,
                    plaintext: '[Unable to decrypt]',
                    decryptError: result.error || true,
                };
            });
            state.messagesByThread.set(threadId, decrypted);
            renderActiveThread();
        } catch (error) {
            showAlert('error', error.message || 'Failed to load conversation.');
        }
    }

    function setActiveThread(threadId) {
        state.activeThreadId = threadId;
        renderActiveThread();
    }

    function renderActiveThread() {
        const thread = state.threads.find((t) => t.id === state.activeThreadId) || null;
        const messages = state.messagesByThread.get(state.activeThreadId) || [];
        if (!thread) {
            setChatHeaderDefault();
        } else {
            updateChatHeader(thread, messages);
        }
        renderMessages(messages);
        updateDebugPanel(thread, messages);
    }

    function setChatHeaderDefault() {
        if (els.activePartner) els.activePartner.textContent = 'Select a session';
        if (els.activeSubject) els.activeSubject.textContent = 'No conversation selected';
        if (els.activeStatus) els.activeStatus.textContent = 'Choose a subject to view the secure chat.';
        if (els.statusPill) {
            els.statusPill.textContent = 'Idle';
            els.statusPill.className = 'status-pill';
        }
        if (els.closedBanner) els.closedBanner.style.display = 'none';
        if (els.messageForm) els.messageForm.style.display = 'none';
        if (els.sessionInspector) els.sessionInspector.style.display = 'none';
        if (els.inspectorPartner) els.inspectorPartner.textContent = '—';
        if (els.inspectorSubject) els.inspectorSubject.textContent = '—';
        if (els.inspectorStatus) els.inspectorStatus.textContent = '—';
        if (els.inspectorUpdated) els.inspectorUpdated.textContent = '—';
    }

    function updateChatHeader(thread, messages) {
        if (els.activePartner) {
            els.activePartner.textContent = thread.partner ? thread.partner.name : 'Conversation';
        }
        if (els.activeSubject) {
            els.activeSubject.textContent = thread.subject;
        }
        const lastMessage = messages[messages.length - 1];
        const waitingFor = lastMessage
            ? (lastMessage.isSelf ? 'Awaiting other party' : 'Awaiting your reply')
            : 'No messages yet.';
        if (els.activeStatus) {
            els.activeStatus.textContent = thread.resolved ? 'Resolved session' : waitingFor;
        }
        if (els.statusPill) {
            els.statusPill.textContent = thread.resolved ? 'Resolved' : 'Active';
            els.statusPill.className = `status-pill ${thread.resolved ? 'closed' : 'active'}`;
        }
        if (els.closedBanner) {
            els.closedBanner.style.display = thread.resolved ? 'block' : 'none';
        }
        if (els.messageForm) {
            els.messageForm.style.display = thread.resolved ? 'none' : 'block';
        }
        if (els.sessionInspector) {
            els.sessionInspector.style.display = 'grid';
        }
        if (els.inspectorPartner) {
            els.inspectorPartner.textContent = thread.partner ? thread.partner.name : '—';
        }
        if (els.inspectorSubject) {
            els.inspectorSubject.textContent = thread.subject || '—';
        }
        if (els.inspectorStatus) {
            els.inspectorStatus.textContent = thread.resolved ? 'Closed' : 'Active';
        }
        if (els.inspectorUpdated) {
            els.inspectorUpdated.textContent = formatTimestamp(thread.updated_at);
        }
    }

    function renderMessages(messages) {
        if (!els.chatMessages) {
            return;
        }
        if (!messages.length) {
            els.chatMessages.innerHTML = '<p class="muted">Nothing to show yet.</p>';
            return;
        }
        els.chatMessages.innerHTML = '';
        const fragment = document.createDocumentFragment();
        messages.forEach((message) => {
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${message.isSelf ? 'is-self' : 'is-partner'}`;
            const ciphertextPreview = message.ciphertext ? `${escapeHtml(message.ciphertext.slice(0, 28))}…` : 'n/a';
            const senderKeyPreview = message.senderPublicKey
                ? `${escapeHtml(message.senderPublicKey.slice(0, 18))}…`
                : 'n/a';
            const recipientKeyPreview = message.recipientPublicKey
                ? `${escapeHtml(message.recipientPublicKey.slice(0, 18))}…`
                : 'n/a';
            const readState = message.readAt ? formatTimestamp(message.readAt) : 'Not read';
            const decryptState = message.decryptError
                ? escapeHtml(typeof message.decryptError === 'string' ? message.decryptError : 'Decryption failed')
                : `OK (${message.decryptKeyPreview || 'n/a'})`;
            bubble.innerHTML = `
                <div class="bubble-meta">
                    <strong>${escapeHtml(message.senderName)}</strong>
                    <span>${formatTimestamp(message.createdAt)}</span>
                </div>
                <p>${escapeHtml(message.plaintext)}</p>
                ${state.debugMode ? `<div class="bubble-debug-grid">
                    <div><span>ID</span>${message.id}</div>
                    <div><span>Sender Key</span>${senderKeyPreview}</div>
                    <div><span>Recipient Key</span>${recipientKeyPreview}</div>
                    <div><span>Read</span>${readState}</div>
                    <div><span>Ciphertext</span>${ciphertextPreview}</div>
                    <div><span>Decrypt</span>${decryptState}</div>
                </div>` : ''}
            `;
            fragment.appendChild(bubble);
        });
        els.chatMessages.appendChild(fragment);
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }

    async function sendEncryptedMessage(threadId, plaintext, resolve) {
        if (!window.ChatCrypto) {
            throw new Error('Crypto helper missing.');
        }
        const thread = state.threads.find((t) => t.id === threadId);
        if (!thread) {
            throw new Error('Thread not found.');
        }
        const partnerId = thread.partner?.id;
        if (!partnerId) {
            throw new Error('Partner ID missing for this thread.');
        }
        const partnerKey = await fetchPartnerPublicKey(partnerId, { forceRefresh: true });
        if (!partnerKey) {
            throw new Error('Partner has not registered a secure chat key yet.');
        }
        const payload = window.ChatCrypto.encryptMessage(plaintext, partnerKey);
        const body = {
            thread_id: threadId,
            ciphertext_b64: payload.ciphertextB64,
            sender_public_key: payload.senderPublicKey,
            recipient_public_key: payload.recipientPublicKey,
            resolve,
        };
        await fetchJSON(API.messages, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        updateDebugPanel();
    }

    function getCachedPartnerKey(userId) {
        const entry = state.keyCache.get(userId);
        if (entry && typeof entry === 'object') {
            return entry.publicKey || null;
        }
        if (typeof entry === 'string') {
            return entry;
        }
        return null;
    }

    async function fetchPartnerPublicKey(userId, options = {}) {
        const { forceRefresh = false } = options;
        if (!userId) {
            return null;
        }
        const cached = state.keyCache.get(userId);
        if (cached && !forceRefresh) {
            return typeof cached === 'string' ? cached : cached.publicKey || null;
        }
        const params = new URLSearchParams();
        params.append('user_id', String(userId));
        try {
            const response = await fetchJSON(`${API.keyring}?${params.toString()}`);
            const record = response?.keys?.find?.((key) => key.user_id === userId);
            if (record?.public_key) {
                state.keyCache.set(userId, {
                    publicKey: record.public_key,
                    updatedAt: record.updated_at || null,
                });
                updateDebugPanel();
                return record.public_key;
            }
        } catch (error) {
            if (cached && !forceRefresh) {
                return typeof cached === 'string' ? cached : cached.publicKey || null;
            }
            throw error;
        }
        if (cached) {
            return typeof cached === 'string' ? cached : cached.publicKey || null;
        }
        return null;
    }

    async function populatePriests() {
        if (!els.priestSelect) return;
        try {
            const priests = await fetchJSON(API.priests);
            if (!priests.length) {
                els.priestSelect.innerHTML = '<option value="">No priests available</option>';
                return;
            }
            const options = priests.map(
                (priest) => `<option value="${priest.id}">${escapeHtml(priest.full_name || priest.username)}</option>`,
            ).join('');
            els.priestSelect.innerHTML = `<option value="">Select a priest</option>${options}`;
        } catch (error) {
            console.error(error);
            els.priestSelect.innerHTML = '<option value="">Failed to load priests</option>';
        }
    }

    function updateStats() {
        if (state.session.role !== 'priest') {
            return;
        }
        const total = state.threads.length;
        const closed = state.threads.filter((thread) => thread.resolved).length;
        const open = total - closed;
        if (els.statTotal) els.statTotal.textContent = total.toString();
        if (els.statAwaiting) els.statAwaiting.textContent = open.toString();
        if (els.statReplied) els.statReplied.textContent = closed.toString();
    }

    function fetchJSON(url, options = {}) {
        return fetch(url, {
            credentials: 'same-origin',
            ...options,
        }).then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.success === false) {
                const message = data?.message || `Request to ${url} failed.`;
                throw new Error(message);
            }
            return data;
        });
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        if (!state.autoRefreshEnabled) {
            return;
        }
        state.autoRefreshTimer = window.setInterval(() => {
            if (document.hidden || state.loadingThreads) {
                return;
            }
            loadThreads(true);
        }, state.autoRefreshInterval);
    }

    function stopAutoRefresh() {
        if (state.autoRefreshTimer) {
            clearInterval(state.autoRefreshTimer);
            state.autoRefreshTimer = null;
        }
    }

    function setComposerDisabled(disabled) {
        if (!els.messageForm) {
            return;
        }
        const elements = els.messageForm.querySelectorAll('textarea, button, input');
        elements.forEach((node) => {
            // eslint-disable-next-line no-param-reassign
            node.disabled = disabled;
        });
    }

    function setFormDisabled(form, disabled) {
        if (!form) return;
        const nodes = form.querySelectorAll('input, select, textarea, button');
        nodes.forEach((node) => {
            // eslint-disable-next-line no-param-reassign
            node.disabled = disabled;
        });
    }

    function formatTimestamp(value) {
        if (!value) return '';
        const date = new Date(value.replace(' ', 'T'));
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString(undefined, {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
        });
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') {
            return str;
        }
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getFilteredThreads() {
        if (!state.threadFilter) {
            return state.threads;
        }
        const term = state.threadFilter.toLowerCase();
        return state.threads.filter((thread) => {
            const subject = (thread.subject || '').toLowerCase();
            const partner = (thread.partner?.name || '').toLowerCase();
            return subject.includes(term) || partner.includes(term);
        });
    }

    function tryDecryptWithCandidates(ciphertext, candidates) {
        const tried = [];
        for (const candidate of candidates) {
            if (!candidate) {
                continue;
            }
            try {
                const plaintext = window.ChatCrypto.decryptMessage(ciphertext, candidate);
                return {
                    success: true,
                    plaintext,
                    keyPreview: `${candidate.slice(0, 16)}…`,
                };
            } catch (error) {
                tried.push(error.message);
            }
        }
        const message = tried.length ? tried.join(' | ') : 'No valid key';
        return { success: false, error: message };
    }

    function updateDebugPanel(thread = null, messages = null) {
        if (!els.debugPanel || !els.debugPanelBody) {
            return;
        }
        if (!state.debugMode) {
            els.debugPanel.style.display = 'none';
            els.debugPanelBody.textContent = '';
            return;
        }
        const activeThread = thread ?? (state.threads.find((t) => t.id === state.activeThreadId) || null);
        const messageList = messages ?? (state.activeThreadId
            ? state.messagesByThread.get(state.activeThreadId) || []
            : []);
        const localKeyPair = window.ChatCrypto?.getKeyPair?.() || null;
        const partnerId = activeThread?.partner?.id ?? null;
        const cachedPartnerRecord = partnerId ? state.keyCache.get(partnerId) || null : null;
        let partnerKeyPreview = null;
        let partnerKeyUpdatedAt = null;
        if (cachedPartnerRecord) {
            const keyValue = typeof cachedPartnerRecord === 'string'
                ? cachedPartnerRecord
                : cachedPartnerRecord.publicKey;
            if (keyValue) {
                partnerKeyPreview = `${keyValue.slice(0, 24)}…`;
            }
            if (typeof cachedPartnerRecord === 'object') {
                partnerKeyUpdatedAt = cachedPartnerRecord.updatedAt || null;
            }
        }
        const payload = {
            session: {
                user_id: state.session?.user_id ?? null,
                role: state.session?.role ?? null,
                authenticated: Boolean(state.session),
            },
            localKey: localKeyPair
                ? {
                    publicKeyPreview: `${localKeyPair.publicKey.slice(0, 24)}…`,
                    privateKeyLength: localKeyPair.privateKey.length,
                }
                : 'No local key pair present',
            thread: activeThread
                ? {
                    id: activeThread.id,
                    subject: activeThread.subject,
                    partner: activeThread.partner,
                    resolved: activeThread.resolved,
                    updated_at: activeThread.updated_at,
                }
                : null,
            partnerKeyPreview,
            partnerKeyUpdatedAt,
            metrics: {
                totalThreads: state.threads.length,
                filteredThreads: getFilteredThreads().length,
                messageCount: messageList.length,
            },
            lastMessage: messageList.length
                ? {
                    id: messageList[messageList.length - 1].id,
                    senderId: messageList[messageList.length - 1].senderId,
                    readAt: messageList[messageList.length - 1].readAt,
                }
                : null,
        };
        els.debugPanelBody.textContent = JSON.stringify(payload, null, 2);
        els.debugPanel.style.display = 'block';
    }

    function showAlert(type, message) {
        if (!els.alertArea || !message) {
            return;
        }
        const color = type === 'success' ? '#2f684e' : '#8c3333';
        els.alertArea.innerHTML = `
            <div class="alert" style="background: rgba(255,255,255,0.8); border:1px solid ${color}; padding:12px; border-radius:6px; margin-bottom:15px; color:${color};">
                ${escapeHtml(message)}
            </div>
        `;
        setTimeout(() => {
            if (els.alertArea) {
                els.alertArea.innerHTML = '';
            }
        }, 5000);
    }
})();
