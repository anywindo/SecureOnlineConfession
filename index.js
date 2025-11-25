document.addEventListener('DOMContentLoaded', () => {
    // Modal Elements
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    // Centralized Content Data
    const modalData = {
        "home": {
            title: "Home",
            content: "Welcome to the Monastery of Luminous. We offer peace and sanctuary to all who seek it."
        },
        "services": {
            title: "Divine Office Schedule",
            content: `
                <p style="text-align:center; margin-bottom:15px;"><i>"Seven times a day I have praised thee." - Psalm 119:164</i></p>
                <table class="service-table">
                    <thead>
                        <tr>
                            <th>Office</th>
                            <th>Time</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Vigils / Matins</td>
                            <td>4:00 AM</td>
                            <td>The Night Watch</td>
                        </tr>
                        <tr>
                            <td>Lauds</td>
                            <td>6:00 AM</td>
                            <td>Morning Praise</td>
                        </tr>
                        <tr>
                            <td><strong>Holy Mass</strong></td>
                            <td><strong>8:00 AM</strong></td>
                            <td>Daily Eucharist</td>
                        </tr>
                        <tr>
                            <td>Terce</td>
                            <td>9:30 AM</td>
                            <td>Mid-Morning Prayer</td>
                        </tr>
                        <tr>
                            <td>Sext</td>
                            <td>12:00 PM</td>
                            <td>Mid-Day Prayer</td>
                        </tr>
                        <tr>
                            <td>None</td>
                            <td>3:00 PM</td>
                            <td>Afternoon Prayer</td>
                        </tr>
                        <tr>
                            <td>Vespers</td>
                            <td>6:00 PM</td>
                            <td>Evening Prayer</td>
                        </tr>
                        <tr>
                            <td>Compline</td>
                            <td>8:00 PM</td>
                            <td>Night Prayer</td>
                        </tr>
                    </tbody>
                </table>
            `
        },
        "news": {
            title: "Abbey Chronicles",
            content: `
                <div class="news-scroll-wrapper">
                    <div class="news-item">
                        <span class="news-date">November 22, 2011</span>
                        <h4 class="news-headline">Renovations on the East Wing Complete</h4>
                        <p class="news-body">We are pleased to announce that the restoration of the old stonework in the East Wing is finally finished. Brother Jeremiah and the local masons have done excellent work preserving the 14th-century archways.</p>
                    </div>
                    <div class="news-item">
                        <span class="news-date">November 15, 2011</span>
                        <h4 class="news-headline">Great Harvest in the Abbey Gardens</h4>
                        <p class="news-body">Thanks be to God for a bountiful harvest this autumn. The pumpkin and squash yield has broken all previous records. We will be distributing extra produce to the village food bank next Tuesday.</p>
                    </div>
                    <div class="news-item">
                        <span class="news-date">November 10, 2011</span>
                        <h4 class="news-headline">New Ancient Manuscript Acquired</h4>
                        <p class="news-body">The library has received a generous donation of a 17th-century breviary. It is currently undergoing restoration and will be on display in the main hall for the Feast of St. Andrew.</p>
                    </div>
                    <div class="news-item">
                        <span class="news-date">October 28, 2011</span>
                        <h4 class="news-headline">Preparation for Advent</h4>
                        <p class="news-body">The choir has begun rehearsals for the Advent season. We invite all parishioners to join us for the special candlelight vigils that will be held every Sunday evening leading up to Christmas.</p>
                    </div>
                    <div class="news-item">
                        <span class="news-date">October 15, 2011</span>
                        <h4 class="news-headline">Brother Thomas Finds Lost Sheep</h4>
                        <p class="news-body">In a literal interpretation of the parable, Brother Thomas successfully located a lamb that had wandered off into the nearby woods. Both monk and sheep are safe and sound.</p>
                    </div>
                </div>
            `
        },
        "confession": {
            title: "Online Confession",
            content: `
                <p style="text-align:center;"><strong>Welcome, child.</strong></p>
                <p>Please kneel and prepare your heart. The confessional is encrypted and secure.</p>
                <p><i>"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness." - 1 John 1:9</i></p>
                <hr style="border:0; border-top:1px dashed #8c7348; margin:20px 0;">
                <p style="font-size:14px;">Enter your confession below (optional):</p>
                <textarea style="width:100%; height:100px; margin-top:10px; padding:10px; background:rgba(255,255,255,0.5); border:1px solid #8c7348; font-family:'PT Sans', sans-serif;"></textarea>
                <button style="margin-top:10px; padding:8px 20px; background:#8c3333; color:white; border:none; cursor:pointer; font-family:'Cinzel', serif;">Absolve</button>
            `
        },
        "donation": {
            title: "Support Our Mission",
            content: `
                <div style="text-align: center; padding: 10px;">
                    <p style="margin-bottom: 20px; font-style: italic;">"God loves a cheerful giver." - 2 Corinthians 9:7</p>
                    <p style="margin-bottom: 20px;">Your generosity helps us maintain the abbey, support our charitable works, and preserve our ancient traditions.</p>
                    
                    <div class="donation-btn-group" id="donation-amounts">
                        <button class="donation-btn">$10</button>
                        <button class="donation-btn">$20</button>
                        <button class="donation-btn">$50</button>
                        <button class="donation-btn">Other</button>
                    </div>
                    
                    <input type="number" id="custom-amount" placeholder="Enter amount" style="display:none; width:100%; padding:10px; margin-bottom:20px; border:1px solid #8c7348; background:#fffdf5; font-family:'PT Sans', sans-serif;">

                    <button id="donate-btn" class="login-btn" style="width: 100%;">Proceed to Donation</button>
                    
                    <p style="margin-top: 15px; font-size: 12px; color: #8c3333;">* This is a secure transaction.</p>
                </div>
            `
        },
        "prayer": {
            title: "Prayer Request",
            content: `
                <div style="padding: 10px;">
                    <p style="margin-bottom: 20px; font-style: italic; text-align: center;">"Monks are usually considered the 'Pray-ers,' and we always carry the needs of others before the Lord God and the Throne of Mercy."</p>
                    
                    <div class="form-group">
                        <label>Your Name (Optional)</label>
                        <input type="text" id="prayer-name" class="form-input" placeholder="Enter your name">
                    </div>
                    
                    <div class="form-group">
                        <label>Your Intention</label>
                        <textarea id="prayer-intention" class="form-input" rows="4" placeholder="Share your prayer request..." required></textarea>
                    </div>

                    <button id="submit-prayer-btn" class="login-btn" style="width: 100%;">Submit Prayer Request</button>
                </div>
            `
        },
        "volunteer": {
            title: "Volunteering Work",
            content: `
                <div id="volunteer-list-view">
                    <p style="text-align:center; margin-bottom:20px; font-style:italic;">"Work is prayer." - St. Benedict</p>
                    
                    <div class="job-card" style="border: 1px solid #8c7348; padding: 15px; margin-bottom: 15px; background: #fffdf5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="font-family: 'Cinzel', serif; color: #5e4533; margin-bottom: 5px; font-size: 18px;">Cloister Gardener</h3>
                        <p style="font-size: 14px; margin-bottom: 10px; color: #333;">Help maintain the serenity and beauty of our sacred gardens.</p>
                        <button class="donation-btn job-select-btn" data-job="gardener" style="padding: 8px 20px; font-size: 14px; width:auto;">View Details</button>
                    </div>

                    <div class="job-card" style="border: 1px solid #8c7348; padding: 15px; margin-bottom: 15px; background: #fffdf5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="font-family: 'Cinzel', serif; color: #5e4533; margin-bottom: 5px; font-size: 18px;">Library Archivist</h3>
                        <p style="font-size: 14px; margin-bottom: 10px; color: #333;">Assist in preserving and cataloging our ancient manuscripts.</p>
                        <button class="donation-btn job-select-btn" data-job="archivist" style="padding: 8px 20px; font-size: 14px; width:auto;">View Details</button>
                    </div>

                    <div class="job-card" style="border: 1px solid #8c7348; padding: 15px; margin-bottom: 15px; background: #fffdf5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="font-family: 'Cinzel', serif; color: #5e4533; margin-bottom: 5px; font-size: 18px;">Kitchen Aid</h3>
                        <p style="font-size: 14px; margin-bottom: 10px; color: #333;">Help prepare simple, nourishing meals for the community.</p>
                        <button class="donation-btn job-select-btn" data-job="kitchen" style="padding: 8px 20px; font-size: 14px; width:auto;">View Details</button>
                    </div>
                </div>
            `
        },
        "gallery": {
            title: "Abbey Gallery",
            content: `
                <p style="text-align:center; margin-bottom:20px; font-style:italic;">Glimpses of life within the cloister walls.</p>
                <div class="gallery-grid">
                    <div class="gallery-item">
                        <img src="assets/TheEastWindow.png" alt="Stained Glass">
                        <div class="gallery-caption">The East Window</div>
                    </div>
                    <div class="gallery-item">
                        <img src="assets/LibraryArchives.png" alt="Old Book">
                        <div class="gallery-caption">Library Archives</div>
                    </div>
                    <div class="gallery-item">
                        <img src="assets/VespersCandelight.png" alt="Candles">
                        <div class="gallery-caption">Vespers Candlelight</div>
                    </div>
                    <div class="gallery-item">
                        <img src="assets/TheGarden.png" alt="Cloister Garden">
                        <div class="gallery-caption">The Cloister Garden</div>
                    </div>
                    <div class="gallery-item">
                        <img src="assets/TheMainEntrance.png" alt="Architecture">
                        <div class="gallery-caption">Main Chapel Entrance</div>
                    </div>
                    <div class="gallery-item">
                        <img src="assets/ScriptoriumWork.png" alt="Writing">
                        <div class="gallery-caption">Scriptorium Work</div>
                    </div>
                </div>
            `
        },
        "login": {
            title: "Member Access",
            content: `
                <div class="login-container">
                    <form id="modal-login-form" class="login-panel login-form" method="post" action="php/login.php">
                        <p class="role-note">Enter your confession credentials below.</p>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-input" name="username" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" class="form-input" name="password" required>
                        </div>
                        <div class="form-message" data-form-message></div>
                        <button type="submit" class="login-btn">Enter Portal</button>
                        <a href="#" data-key="register" data-start-tab="register-tab" class="forgot-password">Need an account? Register here.</a>
                    </form>
                </div>
            `
        }
    };

    modalData["register"] = {
        title: "Login & Register",
        content: `
            <div class="login-container">
                <div class="login-nav">
                    <button class="tab-link active" data-tab="login-tab">Login</button>
                    <button class="tab-link" data-tab="register-tab">Register</button>
                </div>
                <div id="login-tab" class="tab-panel active">
                    <form class="login-panel login-form" method="post" action="php/login.php" data-tab-form="login">
                        <p class="role-note">Enter your credentials.</p>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-input" name="username" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" class="form-input" name="password" required>
                        </div>
                        <div class="form-message" data-form-message></div>
                        <button type="submit" class="login-btn">Enter Portal</button>
                    </form>
                </div>
                <div id="register-tab" class="tab-panel">
                    <form class="login-panel login-form" method="post" action="php/register.php" data-tab-form="register">
                        <p style="font-style:italic; font-size:13px; color:#5e4533; text-align:center; margin-bottom:10px;">
                            Select your role and complete the form below.
                        </p>
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" class="form-input" name="full_name" required>
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-input" name="username" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" class="form-input" name="password" minlength="8" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm Password</label>
                            <input type="password" class="form-input" name="confirm_password" minlength="8" required>
                        </div>
                        <div class="form-group">
                            <label>Register as</label>
                            <select name="role" class="form-input" required>
                                <option value="user">Penitent (standard user)</option>
                                <option value="priest">Priest / Spiritual Guide</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priest Invite Code</label>
                            <input type="text" class="form-input" name="priest_code" placeholder="Required for priests">
                        </div>
                        <div class="form-message" data-form-message></div>
                        <button type="submit" class="login-btn">Create Account</button>
                    </form>
                </div>
            </div>
        `
    };

    // Async function to check session
    async function checkSession() {
        try {
            const response = await fetch('php/api/session.php');
            const data = await response.json();
            return { loggedIn: data.authenticated, ...data };
        } catch (e) {
            return { loggedIn: false };
        }
    }

    // Update UI based on session
    async function updateUI() {
        const session = await checkSession();
        const welcomeDiv = document.getElementById('user-welcome');
        const loginBtn = document.getElementById('login-btn');
        const usernameDisplay = document.getElementById('username-display');

        if (session.loggedIn) {
            welcomeDiv.style.display = 'inline-block';
            loginBtn.style.display = 'none';
            usernameDisplay.textContent = session.full_name || session.username;
        } else {
            welcomeDiv.style.display = 'none';
            loginBtn.style.display = 'inline-flex';
        }
    }

    // Initial check
    updateUI();

    // Logout Handler
    document.getElementById('logout-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('php/logout.php');
        window.location.reload();
    });

    // Helper to handle form submission via AJAX
    async function handleAuthSubmit(e, url, redirectUrl = null) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const btn = form.querySelector('button');
        const originalText = btn.innerText;
        const messageEl = form.querySelector('[data-form-message]');

        btn.disabled = true;
        btn.innerText = 'Processing...';

        // Remove existing alerts
        form.querySelectorAll('.alert').forEach(el => el.remove());
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.classList.remove('success');
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                body: formData
            });
            const json = await res.json();

            if (json.success) {
                if (messageEl) {
                    messageEl.textContent = json.message || 'Success.';
                    messageEl.classList.add('success');
                }
                // Success
                if (url.includes('login.php')) {
                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else {
                        // Stay on page, close modal, update UI
                        modalOverlay.classList.remove('active');
                        updateUI();
                    }
                } else {
                    // Registration success
                    form.innerHTML = `<div class="alert alert-success">${json.message}</div><p style="text-align:center"><a href="#" data-key="login">Proceed to Login</a></p>`;
                    // Re-bind login link
                    form.querySelector('a').addEventListener('click', () => openModal('login'));
                }
            } else {
                // Error: Show Alert
                if (messageEl) {
                    messageEl.textContent = json.message || 'Unable to process request.';
                    messageEl.classList.remove('success');
                } else {
                    const alert = document.createElement('div');
                    alert.className = 'alert alert-error';
                    alert.style.marginBottom = '15px';
                    alert.innerText = json.message;
                    form.insertBefore(alert, form.firstChild);
                }
            }
        } catch (err) {
            if (messageEl) {
                messageEl.textContent = 'Connection error. Please try again.';
                messageEl.classList.remove('success');
            } else {
                const alert = document.createElement('div');
                alert.className = 'alert alert-error';
                alert.innerText = 'Connection error. Please try again.';
                form.insertBefore(alert, form.firstChild);
            }
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }

    async function openModal(key, options = {}) {
        // Special handling for confession: Check login first
        if (key === 'confession') {
            const session = await checkSession();
            if (session.loggedIn) {
                // If logged in, redirect to dashboard
                window.location.href = 'confession.html';
                return;
            } else {
                // If not logged in, show a prompt to login
                modalTitle.innerText = "Authentication Required";
                modalBody.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <p style="margin-bottom:20px;">You must be a registered member of the order to enter the confessional.</p>
                        <button id="prompt-login-btn" class="login-btn" style="width:auto; padding:10px 30px;">Log In / Register</button>
                    </div>
                `;
                modalOverlay.classList.add('active');

                // Bind the button to open the login modal WITH REDIRECT INTENT
                document.getElementById('prompt-login-btn').addEventListener('click', () => {
                    openModal('login', { redirect: 'confession.html' });
                });
                return;
            }
        }

        const data = modalData[key];
        const contentEl = document.querySelector('.modal-content');

        if (data) {
            modalTitle.innerText = data.title;
            modalBody.innerHTML = data.content;

            if (key === 'news' || key === 'gallery') {
                contentEl.classList.add('wide');
            } else {
                contentEl.classList.remove('wide');
            }

            // Bind AJAX handlers for Login/Register forms
            if (key === 'login') {
                const form = modalBody.querySelector('#modal-login-form');
                if (form) {
                    form.addEventListener('submit', (e) =>
                        handleAuthSubmit(e, form.getAttribute('action'), options.redirect ?? null)
                    );
                }
            }
            if (key === 'register') {
                const tabLinks = modalBody.querySelectorAll('.tab-link');
                const panels = modalBody.querySelectorAll('.tab-panel');

                const activateTab = (tabId) => {
                    tabLinks.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
                    panels.forEach((panel) => panel.classList.toggle('active', panel.id === tabId));
                };

                tabLinks.forEach((btn) => {
                    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
                });

                activateTab(options.startTab || 'login-tab');

                modalBody.querySelectorAll('form').forEach((form) => {
                    const action = form.getAttribute('action');
                    const redirect = form.dataset.tabForm === 'login' ? 'index.html' : null;
                    form.addEventListener('submit', (e) => handleAuthSubmit(e, action, redirect));
                });
            }

            // Donation Logic
            if (key === 'donation') {
                const amountBtns = modalBody.querySelectorAll('.donation-btn');
                const donateBtn = modalBody.querySelector('#donate-btn');
                const customAmountInput = modalBody.querySelector('#custom-amount');
                let selectedAmount = null;

                amountBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        // Reset styles
                        amountBtns.forEach(b => b.classList.remove('selected'));
                        // Set active style
                        btn.classList.add('selected');

                        if (btn.innerText === 'Other') {
                            customAmountInput.style.display = 'block';
                            customAmountInput.focus();
                            selectedAmount = null; // Will be read from input
                        } else {
                            customAmountInput.style.display = 'none';
                            selectedAmount = btn.innerText;
                        }
                    });
                });

                if (donateBtn) {
                    donateBtn.addEventListener('click', () => {
                        // Validation
                        let finalAmount = selectedAmount;
                        if (!finalAmount && customAmountInput.style.display === 'block') {
                            const val = customAmountInput.value.trim();
                            if (val) {
                                finalAmount = '$' + val;
                            }
                        }

                        if (!finalAmount) {
                            alert("Please select or enter a donation amount.");
                            return;
                        }

                        // 1. Verification Step
                        modalBody.innerHTML = `
                            <div style="text-align:center; padding:40px 20px;">
                                <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#8c7348">
                                    <g fill="none" fill-rule="evenodd">
                                        <g transform="translate(1 1)" stroke-width="2">
                                            <circle cx="22" cy="22" r="6" stroke-opacity="0">
                                                <animate attributeName="r" begin="1.5s" dur="3s" values="6;22" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-opacity" begin="1.5s" dur="3s" values="1;0" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-width" begin="1.5s" dur="3s" values="2;0" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="22" cy="22" r="6" stroke-opacity="0">
                                                <animate attributeName="r" begin="3s" dur="3s" values="6;22" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-opacity" begin="3s" dur="3s" values="1;0" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-width" begin="3s" dur="3s" values="2;0" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="22" cy="22" r="8">
                                                <animate attributeName="r" begin="0s" dur="1.5s" values="6;1;2;3;4;5;6" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                        </g>
                                    </g>
                                </svg>
                                <p style="margin-top:20px; font-family:'Cinzel', serif; color:#5e4533; font-size:16px;">Verifying Transaction...</p>
                                <p style="font-size:12px; color:#888;">Please wait while we contact the bank.</p>
                            </div>
                        `;

                        // 2. Success Step (after delay)
                        setTimeout(() => {
                            modalBody.innerHTML = `
                                <div style="text-align:center; padding:30px 20px;">
                                    <div class="checkmark-container">
                                        <svg class="checkmark-icon" viewBox="0 0 24 24">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <h3 style="font-family:'Cinzel', serif; color:#2e7d32; margin-bottom:10px; text-shadow: 0 1px 0 rgba(255,255,255,0.5);">Donation Successful</h3>
                                    <p style="margin-bottom:20px; font-size:15px;">Thank you for your generous gift of <strong>${finalAmount}</strong>.</p>
                                    <p style="font-style:italic; color:#5e4533;">"And God is able to bless you abundantly, so that in all things at all times, having all that you need, you will abound in every good work."</p>
                                    <button id="close-donation-btn" class="login-btn" style="margin-top:25px; width: auto; padding: 10px 40px;">Close</button>
                                </div>
                            `;

                            // Re-bind close button
                            document.getElementById('close-donation-btn').addEventListener('click', () => {
                                modalOverlay.classList.remove('active');
                            });
                        }, 2500);
                    });
                }
            }

            // Prayer Request Logic
            if (key === 'prayer') {
                const submitBtn = modalBody.querySelector('#submit-prayer-btn');
                const intentionInput = modalBody.querySelector('#prayer-intention');

                if (submitBtn) {
                    submitBtn.addEventListener('click', () => {
                        const intention = intentionInput.value.trim();

                        if (!intention) {
                            alert("Please enter your prayer intention.");
                            return;
                        }

                        // 1. Sending Step
                        modalBody.innerHTML = `
                            <div style="text-align:center; padding:40px 20px;">
                                <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#8c7348">
                                    <g fill="none" fill-rule="evenodd">
                                        <g transform="translate(1 1)" stroke-width="2">
                                            <circle cx="22" cy="22" r="6" stroke-opacity="0">
                                                <animate attributeName="r" begin="1.5s" dur="3s" values="6;22" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-opacity" begin="1.5s" dur="3s" values="1;0" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-width" begin="1.5s" dur="3s" values="2;0" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="22" cy="22" r="6" stroke-opacity="0">
                                                <animate attributeName="r" begin="3s" dur="3s" values="6;22" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-opacity" begin="3s" dur="3s" values="1;0" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-width" begin="3s" dur="3s" values="2;0" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="22" cy="22" r="8">
                                                <animate attributeName="r" begin="0s" dur="1.5s" values="6;1;2;3;4;5;6" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                        </g>
                                    </g>
                                </svg>
                                <p style="margin-top:20px; font-family:'Cinzel', serif; color:#5e4533; font-size:16px;">Offering your intentions...</p>
                                <p style="font-size:12px; color:#888;">Please wait.</p>
                            </div>
                        `;

                        // 2. Success Step (after delay)
                        setTimeout(() => {
                            modalBody.innerHTML = `
                                <div style="text-align:center; padding:30px 20px;">
                                    <div class="checkmark-container">
                                        <svg class="checkmark-icon" viewBox="0 0 24 24">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <h3 style="font-family:'Cinzel', serif; color:#2e7d32; margin-bottom:10px; text-shadow: 0 1px 0 rgba(255,255,255,0.5);">Request Received</h3>
                                    <p style="margin-bottom:20px; font-size:15px;">Your intention has been placed before the altar.</p>
                                    <p style="font-style:italic; color:#5e4533;">"Cast all your anxiety on Him because He cares for you." - 1 Peter 5:7</p>
                                    <button id="close-prayer-btn" class="login-btn" style="margin-top:25px; width: auto; padding: 10px 40px;">Close</button>
                                </div>
                            `;

                            // Re-bind close button
                            document.getElementById('close-prayer-btn').addEventListener('click', () => {
                                modalOverlay.classList.remove('active');
                            });
                        }, 2000);
                    });
                }
            }

            // Volunteer Logic
            if (key === 'volunteer') {
                const jobData = {
                    'gardener': {
                        title: "Cloister Gardener",
                        desc: "The Cloister Gardener is responsible for the upkeep of the inner sanctuary gardens. Duties include pruning, watering, and planting seasonal flowers.",
                        time: "Weekends, 7:00 AM - 11:00 AM",
                        reqs: "Must be physically fit and comfortable working in silence."
                    },
                    'archivist': {
                        title: "Library Archivist",
                        desc: "Assist the Head Librarian in organizing, cleaning, and digitizing our collection of theological texts and historical records.",
                        time: "Tuesdays & Thursdays, 1:00 PM - 4:00 PM",
                        reqs: "Attention to detail and respect for fragile materials."
                    },
                    'kitchen': {
                        title: "Kitchen Aid",
                        desc: "Support the brothers in the kitchen by chopping vegetables, preparing dough, and cleaning up after the midday meal.",
                        time: "Daily, 10:00 AM - 1:00 PM",
                        reqs: "Basic knife skills and hygiene certification preferred."
                    }
                };

                const initialContent = modalBody.innerHTML;

                const setupJobListeners = () => {
                    const jobBtns = modalBody.querySelectorAll('.job-select-btn');
                    jobBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            const jobId = btn.getAttribute('data-job');
                            const job = jobData[jobId];
                            showJobForm(job, jobId);
                        });
                    });
                };

                const showJobForm = (job, jobId) => {
                    modalBody.innerHTML = `
                        <div class="job-details-view">
                            <button id="back-to-jobs" style="background:none; border:none; color:#8c3333; cursor:pointer; margin-bottom:15px; font-family:'Cinzel', serif; font-size:14px; display:flex; align-items:center;">
                                <span style="font-size:18px; margin-right:5px;">&#8592;</span> Back to List
                            </button>
                            
                            <h3 style="font-family:'Cinzel', serif; color:#5e4533; font-size:22px; margin-bottom:10px; border-bottom:1px solid #d4c5b0; padding-bottom:10px;">${job.title}</h3>
                            
                            <div style="background:#fffdf5; padding:15px; border:1px solid #d4c5b0; margin-bottom:20px; font-size:14px; color:#333;">
                                <p style="margin-bottom:10px;"><strong>Description:</strong> ${job.desc}</p>
                                <p style="margin-bottom:10px;"><strong>Time Commitment:</strong> ${job.time}</p>
                                <p><strong>Requirements:</strong> ${job.reqs}</p>
                            </div>

                            <h4 style="font-family:'Cinzel', serif; color:#8c3333; margin-bottom:15px;">Application Form</h4>
                            
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="vol-name" class="form-input" placeholder="Your name">
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="vol-email" class="form-input" placeholder="Your email">
                            </div>
                            <div class="form-group">
                                <label>Why do you want to join?</label>
                                <textarea id="vol-reason" class="form-input" rows="3" placeholder="Briefly describe your motivation..."></textarea>
                            </div>

                            <button id="submit-vol-btn" class="login-btn" style="width: 100%;">Submit Application</button>
                        </div>
                    `;

                    // Bind Back Button
                    document.getElementById('back-to-jobs').addEventListener('click', () => {
                        modalBody.innerHTML = initialContent;
                        setupJobListeners(); // Re-bind list buttons
                    });

                    // Bind Submit Button
                    document.getElementById('submit-vol-btn').addEventListener('click', () => {
                        const name = document.getElementById('vol-name').value.trim();
                        const email = document.getElementById('vol-email').value.trim();
                        const reason = document.getElementById('vol-reason').value.trim();

                        if (!name || !email || !reason) {
                            alert("Please complete all fields.");
                            return;
                        }

                        // Simulate Submission
                        modalBody.innerHTML = `
                            <div style="text-align:center; padding:40px 20px;">
                                <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#8c7348">
                                    <g fill="none" fill-rule="evenodd">
                                        <g transform="translate(1 1)" stroke-width="2">
                                            <circle cx="22" cy="22" r="6" stroke-opacity="0">
                                                <animate attributeName="r" begin="1.5s" dur="3s" values="6;22" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-opacity" begin="1.5s" dur="3s" values="1;0" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-width" begin="1.5s" dur="3s" values="2;0" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="22" cy="22" r="6" stroke-opacity="0">
                                                <animate attributeName="r" begin="3s" dur="3s" values="6;22" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-opacity" begin="3s" dur="3s" values="1;0" calcMode="linear" repeatCount="indefinite" />
                                                <animate attributeName="stroke-width" begin="3s" dur="3s" values="2;0" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="22" cy="22" r="8">
                                                <animate attributeName="r" begin="0s" dur="1.5s" values="6;1;2;3;4;5;6" calcMode="linear" repeatCount="indefinite" />
                                            </circle>
                                        </g>
                                    </g>
                                </svg>
                                <p style="margin-top:20px; font-family:'Cinzel', serif; color:#5e4533; font-size:16px;">Submitting Application...</p>
                            </div>
                        `;

                        setTimeout(() => {
                            modalBody.innerHTML = `
                                <div style="text-align:center; padding:30px 20px;">
                                    <div class="checkmark-container">
                                        <svg class="checkmark-icon" viewBox="0 0 24 24">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <h3 style="font-family:'Cinzel', serif; color:#2e7d32; margin-bottom:10px; text-shadow: 0 1px 0 rgba(255,255,255,0.5);">Application Sent</h3>
                                    <p style="margin-bottom:20px; font-size:15px;">Thank you, <strong>${name}</strong>. We have received your interest in the <strong>${job.title}</strong> position.</p>
                                    <p style="font-style:italic; color:#5e4533;">Father John will review your application and contact you shortly.</p>
                                    <button id="close-vol-btn" class="login-btn" style="margin-top:25px; width: auto; padding: 10px 40px;">Close</button>
                                </div>
                            `;

                            document.getElementById('close-vol-btn').addEventListener('click', () => {
                                modalOverlay.classList.remove('active');
                            });
                        }, 2000);
                    });
                };

                // Initialize listeners for the first render
                setupJobListeners();
            }

            // Bind internal links
            const internalLinks = modalBody.querySelectorAll('[data-key]');
            internalLinks.forEach((link) => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = link.getAttribute('data-key');
                    const startTab = link.getAttribute('data-start-tab');
                    openModal(target, startTab ? { startTab } : {});
                });
            });

            modalOverlay.classList.add('active');
        }
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
    }

    const clickables = document.querySelectorAll('[data-key]');
    clickables.forEach((el) => {
        el.addEventListener('click', (e) => {
            const href = el.getAttribute('href');
            if (href && href !== '#') {
                return;
            }
            e.preventDefault();
            const key = el.getAttribute('data-key');
            openModal(key);
        });
    });
});
