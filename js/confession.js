(() => {
    async function fetchJSON(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }
    const state = {
        session: null,
        debugMode: false,
        messagesByPenitent: {},
        activeRecipientId: null,
        activeRecipientName: '',
        activeSubject: '',
        activeReplyConfessionId: null,
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
        confessionList: document.getElementById('confession-list'),
        confessForm: document.getElementById('confess-form'),
        priestSelect: document.getElementById('priest-select'),
        debugToggle: document.getElementById('debug-toggle'),
        penitentList: document.getElementById('penitent-list'),
        penitentItems: document.getElementById('penitent-items'),
        replyForm: document.getElementById('reply-form'),
        replyTarget: document.getElementById('reply-target'),
        conversationModal: document.getElementById('conversationModal'),
        conversationClose: document.getElementById('conversationClose'),
        conversationBody: document.getElementById('conversationBody'),
        conversationTitle: document.getElementById('conversationTitle'),
        modalReplyForm: document.getElementById('modal-reply-form'),
    };

    init();

    async function init() {
        state.session = await fetchJSON('php/api/session.php');
        if (!state.session.authenticated) {
            window.location.href = 'index.html';
            return;
        }

        setupUI();
        registerHandlers();
        if (state.session.role === 'user') {
            await populatePriestSelect();
        }
        loadConfessions();
    }

    function setupUI() {
        const { session } = state;
        els.welcome.style.display = 'inline-block';
        els.loginBtn.style.display = 'none';
        els.usernameDisplay.textContent = session.full_name || session.username;
        els.userRoleDisplay.textContent = session.role === 'priest' ? 'Priest Portal' : 'Penitent Portal';
        els.userNameDisplay.textContent = `Welcome, ${session.full_name || session.username}`;
        els.roleDescription.textContent = session.role === 'priest'
            ? 'Review every confession, validate authenticity, and provide encrypted counsel.'
            : 'Submit your confession and keep track of replies from the clergy.';
        els.confessSection.style.display = session.role === 'user' ? 'block' : 'none';
        els.statsSection.style.display = session.role === 'priest' ? 'grid' : 'none';
        if (state.session.role === 'user') {
            els.replyForm.style.display = 'block';
            els.modalReplyForm.style.display = 'none';
        } else {
            els.replyForm.style.display = 'none';
        }
    }

    function registerHandlers() {
        els.debugToggle?.addEventListener('change', () => {
            state.debugMode = els.debugToggle.checked;
            loadConfessions();
        });

        els.conversationClose?.addEventListener('click', hideModal);
        els.conversationModal?.addEventListener('click', (e) => {
            if (e.target === els.conversationModal) hideModal();
        });

        els.confessForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(els.confessForm);
            formData.append('recipient_id', els.priestSelect.value || '');

            try {
                const response = await postConfession(formData);
                if (response.success) {
                    alert(response.message);
                    els.confessForm.reset();
                    loadConfessions();
                } else {
                    alert(response.message || 'Failed to submit confession.');
                }
            } catch (error) {
                alert('An error occurred. Please try again.');
            }
        });

        els.replyForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.activeRecipientId) {
                alert('Select a conversation to reply.');
                return;
            }
            const formData = new FormData(els.replyForm);
            formData.append('recipient_id', String(state.activeRecipientId));
            formData.append('subject', state.activeSubject || 'Follow-up');
            await postConfession(formData);
            els.replyForm.reset();
            loadConfessions();
        });

        els.modalReplyForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.activeReplyConfessionId) return;
            const payload = {
                reply_id: state.activeReplyConfessionId,
                reply_message: els.modalReplyForm.querySelector('textarea').value,
                end_confession: els.modalReplyForm.querySelector('[name="end_confession"]').checked
            };
            await fetchJSON('php/api/reply.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            els.modalReplyForm.reset();
            hideModal();
            loadConfessions();
        });
    }

    async function populatePriestSelect() {
        try {
            const priests = await fetchJSON('php/api/priests.php');
            els.priestSelect.innerHTML = priests
                .map(priest => `<option value="${priest.id}">${priest.full_name || priest.username}</option>`)
                .join('');
        } catch {
            els.priestSelect.innerHTML = '<option value="">Unable to load priests</option>';
        }
    }

    async function loadConfessions() {
        els.confessionList.innerHTML = '<p>Loading confessions...</p>';
        try {
            const data = await fetchJSON('php/api/confessions.php');
            els.statTotal.textContent = data.stats.total;
            els.statAwaiting.textContent = data.stats.awaiting;
            els.statReplied.textContent = data.stats.replied;

            if (!data.confessions.length) {
                els.confessionList.innerHTML = '<p>No confessions yet.</p>';
                els.replyForm.style.display = state.session.role === 'user' ? 'block' : 'none';
                state.activeRecipientId = null;
                return;
            }

            state.messagesByPenitent = {};
            els.confessionList.innerHTML = '';

            data.confessions.forEach((confession) => {
                const penitentKey = confession.full_name || confession.username;
                if (!state.messagesByPenitent[penitentKey]) {
                    state.messagesByPenitent[penitentKey] = [];
                }
                state.messagesByPenitent[penitentKey].push(confession);
                renderConfessionEntry(confession);
            });

            if (state.session.role === 'user') {
                const last = data.confessions.find((c) => c.recipient_id);
                if (last) {
                    setActiveRecipient(last.recipient_id, last.recipient_name || 'your priest', last.subject);
                }
            } else if (els.penitentList) {
                els.penitentList.style.display = 'block';
                els.penitentItems.innerHTML = Object.keys(state.messagesByPenitent)
                    .map(name => `<li data-penitent="${name}">${name}</li>`).join('');
                els.penitentItems.querySelectorAll('li').forEach(item => {
                    item.addEventListener('click', () => openPenitentModal(item.dataset.penitent));
                });
            }
        } catch {
            els.confessionList.innerHTML = '<p>Failed to load confessions.</p>';
        }
    }

    function renderConfessionEntry(confession) {
        const isUser = state.session.role === 'user';
        const container = document.createElement('div');
        container.className = 'forum-thread';
        if (confession.resolved) {
            container.classList.add('resolved');
            container.style.opacity = '0.8';
        }

        // User Post
        const userInitial = (confession.full_name || confession.username || 'U').charAt(0).toUpperCase();
        const userPostHtml = `
            <div class="forum-post user">
                <div class="post-avatar">
                    <div class="avatar-circle">${userInitial}</div>
                </div>
                <div class="post-content-wrapper">
                    <div class="post-header">
                        <span class="post-author">${confession.full_name || confession.username}</span>
                        <span class="post-date">${confession.created_at}</span>
                    </div>
                    <span class="post-subject">${confession.subject || 'General'}</span>
                    <div class="post-body">${confession.plaintext}</div>
                    <div style="margin-top:5px;">
                        <span class="badge ${confession.signature_valid ? 'badge-valid' : 'badge-invalid'}">
                            ${confession.signature_valid ? 'Signature Valid' : 'Signature Invalid'}
                        </span>
                        ${confession.resolved ? '<span class="badge" style="background:#333; color:#fff; padding:1px 4px; border-radius:4px; font-size:10px; margin-left:5px;">RESOLVED</span>' : ''}
                        ${confession.follow_up ? `<p class="meta" style="margin-top:5px; font-style:italic;">Note: ${confession.follow_up}</p>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Priest Reply
        let priestPostHtml = '';
        if (confession.reply_text) {
            priestPostHtml = `
                <div class="forum-post priest">
                    <div class="post-avatar">
                        <div class="avatar-circle">P</div>
                    </div>
                    <div class="post-content-wrapper">
                        <div class="post-header">
                            <span class="post-author">Priest</span>
                            <span class="post-date">${confession.reply_at || ''}</span>
                        </div>
                        <div class="post-body">${confession.reply_text}</div>
                    </div>
                </div>
            `;
        } else if (isUser && !confession.resolved) {
            priestPostHtml = `
                <div class="forum-post priest" style="opacity:0.6;">
                    <div class="post-avatar">
                        <div class="avatar-circle" style="background:#ccc; border-color:#999;">?</div>
                    </div>
                    <div class="post-content-wrapper">
                        <div class="post-body" style="font-style:italic;">Waiting for priest's reply...</div>
                    </div>
                </div>
            `;
        } else if (!isUser) {
            // Priest View: Add Action Button
            priestPostHtml = `
                <div style="margin-top:10px; text-align:right;">
                    <button class="action-btn">Reply / View Thread</button>
                </div>
            `;
        }

        container.innerHTML = userPostHtml + priestPostHtml;

        if (state.debugMode) {
            container.innerHTML += `
                <div class="debug-block" style="margin:0;">
                    <strong>Debug Data</strong>
                    <p><em>Message Hash:</em> ${confession.message_hash}</p>
                    <p><em>Signature (first 60 chars):</em> ${confession.signature_preview}</p>
                    <p><em>IV:</em> ${confession.iv}</p>
                </div>
            `;
        }

        container.addEventListener('click', (e) => {
            // Handle Priest 'Reply / View Thread' button click
            if (!isUser && e.target.classList.contains('action-btn')) {
                const penitentName = confession.full_name || confession.username;
                openPenitentModal(penitentName);
                return;
            }

            // Handle User click to set active recipient
            if (isUser && confession.recipient_id) {
                // If resolved, do not allow setting as active recipient for reply
                if (confession.resolved) {
                    setActiveRecipient(confession.recipient_id, confession.recipient_name || 'your priest', confession.subject, true);
                } else {
                    setActiveRecipient(confession.recipient_id, confession.recipient_name || 'your priest', confession.subject, false);
                }
            }
        });

        els.confessionList.appendChild(container);
    }

    function setActiveRecipient(id, name, subject, isResolved = false) {
        state.activeRecipientId = id;
        state.activeRecipientName = name;
        state.activeSubject = subject || 'Follow-up';

        if (els.replyTarget) {
            if (isResolved) {
                els.replyTarget.textContent = `Conversation with ${name || 'your priest'} is closed.`;
                els.replyTarget.style.color = '#8c3333';
            } else {
                els.replyTarget.textContent = `Replying to ${name || 'your priest'} • Subject: ${state.activeSubject}`;
                els.replyTarget.style.color = '';
            }
        }

        if (els.replyForm) {
            if (state.session.role === 'user') {
                els.replyForm.style.display = isResolved ? 'none' : 'block';
            } else {
                els.replyForm.style.display = 'none';
            }
        }
    }

    async function postConfession(formData) {
        return await fetchJSON('php/api/confessions.php', {
            method: 'POST',
            body: formData,
        });
    }

    function openPenitentModal(name) {
        const messages = state.messagesByPenitent[name] || [];
        if (!messages.length) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        state.activeReplyConfessionId = lastMessage.id;
        els.conversationTitle.textContent = name;

        els.conversationBody.innerHTML = messages.map(msg => `
            <article class="confession-entry" style="${msg.resolved ? 'border-color:#8c3333;' : ''}">
                <header>
                    <div>
                        <span class="author">${msg.full_name || msg.username}</span>
                        <time>${msg.created_at}</time>
                    </div>
                    <div>
                        <small>${msg.subject || 'General'}</small>
                        ${msg.resolved ? '<span class="badge" style="background:#8c3333; color:#fff; margin-left:5px;">RESOLVED</span>' : ''}
                    </div>
                </header>
                <div class="bubble">${msg.plaintext}</div>
                ${msg.reply_text ? `<div class="reply-block"><strong>Reply</strong><div class="bubble">${msg.reply_text}</div><small>${msg.reply_at || ''}</small></div>` : ''}
            </article>
        `).join('');

        if (lastMessage.resolved) {
            els.modalReplyForm.style.display = 'none';
        } else {
            els.modalReplyForm.style.display = 'block';
        }

        els.conversationModal.classList.add('active');
    }

    function hideModal() {
        els.conversationModal.classList.remove('active');
        state.activeReplyConfessionId = null;
    }
})();
