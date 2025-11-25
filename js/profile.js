document.addEventListener('DOMContentLoaded', () => {
    const fullNameInput = document.getElementById('profile-full-name');
    const usernameInput = document.getElementById('profile-username');
    const rolePill = document.getElementById('profile-role');
    const sessionNameEl = document.getElementById('profile-session-name');
    const messageEl = document.getElementById('profile-message');
    const newPasswordInput = document.getElementById('profile-new-password');
    const confirmPasswordInput = document.getElementById('profile-confirm-password');
    const form = document.getElementById('profile-form');
    const usernameDisplay = document.getElementById('username-display');
    const welcomeBanner = document.getElementById('user-welcome');
    const logoutLink = document.getElementById('logout-link');
    const adminLink = document.getElementById('admin-panel-link');

    const clearMessage = () => {
        messageEl.textContent = '';
        messageEl.classList.remove('success');
    };

    const showMessage = (text, isSuccess = false) => {
        messageEl.textContent = text;
        messageEl.classList.toggle('success', isSuccess);
    };

    const loadProfile = async () => {
        try {
            const res = await fetch('php/api/session.php');
            const session = await res.json();

            if (!session.authenticated) {
                window.location.href = 'index.html';
                return;
            }

            if (welcomeBanner) {
                welcomeBanner.style.display = 'flex';
            }

            sessionNameEl.textContent = session.full_name || session.username || '';
            usernameInput.value = session.username || '';
            fullNameInput.value = session.full_name || '';
            rolePill.textContent = (session.role || 'user').replace(/^\w/, (c) => c.toUpperCase());
            if (usernameDisplay) {
                usernameDisplay.textContent = session.full_name || session.username || '';
            }
            if (adminLink) {
                adminLink.style.display = session.role === 'priest' ? 'block' : 'none';
            }
        } catch (err) {
            showMessage('Unable to load profile. Please refresh.', false);
        }
    };

    logoutLink?.addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('php/logout.php');
        window.location.href = 'index.html';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage();

        const payload = {
            full_name: fullNameInput.value.trim(),
        };

        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (newPass || confirmPass) {
            payload.new_password = newPass;
            payload.confirm_password = confirmPass;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving...';

        try {
            const response = await fetch('php/api/profile.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const json = await response.json();

            if (json.success) {
                showMessage(json.message || 'Profile updated.', true);
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                await loadProfile();
            } else {
                showMessage(json.message || 'Unable to update profile.');
            }
        } catch (err) {
            showMessage('Connection error. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });

    loadProfile();
});
