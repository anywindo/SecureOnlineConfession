/* global CryptoJS, elliptic */
(function (window, document) {
    'use strict';

    if (!window.CryptoJS || !window.elliptic) {
        console.error('ChatCrypto requires CryptoJS and elliptic to be loaded first.');
        return;
    }

    const STORAGE_KEY = 'confession_chat_ecdh_pair';
    const BACKUP_KDF_ITERATIONS = 120000;
    const ec = new window.elliptic.ec('p256');

    const storage = (() => {
        const fallback = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        };
        try {
            const testKey = '__chatcrypto_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return window.localStorage;
        } catch (err) {
            try {
                const testKey = '__chatcrypto_test__';
                window.sessionStorage.setItem(testKey, '1');
                window.sessionStorage.removeItem(testKey);
                return window.sessionStorage;
            } catch (e) {
                console.warn('Storage unavailable for ChatCrypto, keys will be ephemeral.');
                return fallback;
            }
        }
    })();

    function getRandomBytes(length) {
        const array = new Uint8Array(length);
        if (window.crypto?.getRandomValues) {
            window.crypto.getRandomValues(array);
            return array;
        }
        const wordArray = CryptoJS.lib.WordArray.random(length);
        for (let i = 0; i < length; i += 1) {
            array[i] = wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8) & 0xff;
        }
        return array;
    }

    function bytesToHex(bytes) {
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }

    function wordArrayToHex(wordArray) {
        return CryptoJS.enc.Hex.stringify(wordArray);
    }

    function hexToWordArray(hexString) {
        if (!hexString) {
            return CryptoJS.enc.Hex.parse('');
        }
        return CryptoJS.enc.Hex.parse(hexString);
    }

    function deriveBackupKey(passphrase, saltWordArray, iterations = BACKUP_KDF_ITERATIONS) {
        const effectiveIterations = Number(iterations) > 0 ? Number(iterations) : BACKUP_KDF_ITERATIONS;
        return CryptoJS.PBKDF2(passphrase, saltWordArray, {
            keySize: 256 / 32,
            iterations: effectiveIterations,
            hasher: CryptoJS.algo.SHA256,
        });
    }

    function deriveSharedSecretHex(privateHex, otherPublicHex) {
        const privateKey = ec.keyFromPrivate(privateHex, 'hex');
        const otherKey = ec.keyFromPublic(otherPublicHex, 'hex');
        let shared = privateKey.derive(otherKey.getPublic()).toString(16);
        if (shared.length % 2 === 1) {
            shared = `0${shared}`;
        }
        return shared;
    }

    function packCiphertext(iv, ciphertext) {
        const payload = iv.clone().concat(ciphertext);
        return CryptoJS.enc.Base64.stringify(payload);
    }

    function unpackCiphertext(base64Payload) {
        const data = CryptoJS.enc.Base64.parse(base64Payload);
        if (data.sigBytes <= 16) {
            throw new Error('Ciphertext payload is too small.');
        }
        const ivWords = data.words.slice(0, 4);
        const cipherWords = data.words.slice(4);
        const cipherBytes = data.sigBytes - 16;
        return {
            iv: CryptoJS.lib.WordArray.create(ivWords, 16),
            ciphertext: CryptoJS.lib.WordArray.create(cipherWords, cipherBytes),
        };
    }

    function readStoredPair() {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.privateKey && parsed?.publicKey) {
                return {
                    privateKey: parsed.privateKey,
                    publicKey: parsed.publicKey,
                };
            }
            storage.removeItem(STORAGE_KEY);
        } catch (err) {
            storage.removeItem(STORAGE_KEY);
        }
        return null;
    }

    function writeStoredPair(pair) {
        storage.setItem(STORAGE_KEY, JSON.stringify(pair));
    }

    function dispatchKeyChange(pair) {
        const detail = pair
            ? { publicKey: pair.publicKey }
            : null;
        document.dispatchEvent(new CustomEvent('chatcrypto:keychange', { detail }));
    }

    const ChatCrypto = {
        hasKeyPair() {
            return Boolean(readStoredPair());
        },
        getKeyPair() {
            const pair = readStoredPair();
            return pair ? { ...pair } : null;
        },
        getPublicKey() {
            return readStoredPair()?.publicKey ?? null;
        },
        clearKeys() {
            storage.removeItem(STORAGE_KEY);
            dispatchKeyChange(null);
        },
        async registerPublicKey(publicKeyHex) {
            const response = await fetch('php/api/chat/register_key.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_key: publicKeyHex }),
                credentials: 'same-origin',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                const message = data.message || 'Failed to register public key.';
                throw new Error(message);
            }
            return data;
        },
        async generateKeyPair(options = {}) {
            const { persist = true, register = true } = options;
            const entropyHex = bytesToHex(getRandomBytes(32));
            const keyPair = ec.genKeyPair({ entropy: entropyHex, entropyEnc: 'hex' });
            const newPair = {
                publicKey: keyPair.getPublic(false, 'hex'),
                privateKey: keyPair.getPrivate('hex'),
            };
            if (persist) {
                writeStoredPair(newPair);
            }
            if (register) {
                try {
                    await this.registerPublicKey(newPair.publicKey);
                } catch (err) {
                    if (persist) {
                        storage.removeItem(STORAGE_KEY);
                    }
                    dispatchKeyChange(null);
                    throw err;
                }
            }
            dispatchKeyChange(newPair);
            return { ...newPair };
        },
        async ensureKeyPair(options = {}) {
            const { register = false } = options;
            const existing = readStoredPair();
            if (existing) {
                if (register) {
                    try {
                        await this.registerPublicKey(existing.publicKey);
                    } catch (err) {
                        console.warn('Failed to sync public key', err);
                    }
                }
                return existing;
            }
            return this.generateKeyPair(options);
        },
        encryptMessage(plaintext, recipientPublicKeyHex) {
            if (!recipientPublicKeyHex) {
                throw new Error('Recipient public key is required for encryption.');
            }
            const pair = readStoredPair();
            if (!pair) {
                throw new Error('No local key pair found.');
            }
            const sharedHex = deriveSharedSecretHex(pair.privateKey, recipientPublicKeyHex);
            const aesKey = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(sharedHex));
            const iv = CryptoJS.lib.WordArray.random(16);
            const encrypted = CryptoJS.AES.encrypt(plaintext, aesKey, { iv });
            return {
                ciphertextB64: packCiphertext(iv, encrypted.ciphertext),
                senderPublicKey: pair.publicKey,
                recipientPublicKey: recipientPublicKeyHex,
            };
        },
        decryptMessage(ciphertextB64, remotePublicKeyHex, overridePrivateHex) {
            const privateHex = overridePrivateHex || readStoredPair()?.privateKey;
            if (!privateHex) {
                throw new Error('No private key available for decryption.');
            }
            if (!remotePublicKeyHex) {
                throw new Error('Remote public key missing.');
            }
            const sharedHex = deriveSharedSecretHex(privateHex, remotePublicKeyHex);
            const aesKey = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(sharedHex));
            const { iv, ciphertext } = unpackCiphertext(ciphertextB64);
            const decrypted = CryptoJS.AES.decrypt({ ciphertext }, aesKey, { iv });
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            if (!plaintext) {
                throw new Error('Unable to decrypt message.');
            }
            return plaintext;
        },
        getDebugInfo() {
            const pair = readStoredPair();
            return {
                hasKeyPair: Boolean(pair),
                publicKeyPreview: pair ? `${pair.publicKey.slice(0, 10)}…${pair.publicKey.slice(-6)}` : null,
            };
        },
        async exportKey(options = {}) {
            const pair = readStoredPair();
            if (!pair) {
                throw new Error('No key pair to export.');
            }
            const passphrase = options.passphrase ?? '';
            const salt = CryptoJS.lib.WordArray.random(16);
            const iv = CryptoJS.lib.WordArray.random(16);
            const key = deriveBackupKey(passphrase, salt, BACKUP_KDF_ITERATIONS);
            const encrypted = CryptoJS.AES.encrypt(pair.privateKey, key, { iv });
            const backup = {
                version: 1,
                cipher: 'AES-256-CBC',
                kdf: 'PBKDF2-HMAC-SHA256',
                iterations: BACKUP_KDF_ITERATIONS,
                publicKey: pair.publicKey,
                wrappedPrivateKey: encrypted.toString(),
                iv: wordArrayToHex(iv),
                salt: wordArrayToHex(salt),
                createdAt: new Date().toISOString(),
            };
            return backup;
        },
        async importKey(backup, options = {}) {
            if (!backup || typeof backup !== 'object') {
                throw new Error('Invalid backup file.');
            }
            const passphrase = options.passphrase ?? '';
            const register = options.register !== false;
            const salt = hexToWordArray(backup.salt);
            const iv = hexToWordArray(backup.iv);
            const iterations = Number(backup.iterations) > 0 ? Number(backup.iterations) : BACKUP_KDF_ITERATIONS;
            const key = deriveBackupKey(passphrase, salt, iterations);
            const decrypted = CryptoJS.AES.decrypt(backup.wrappedPrivateKey, key, { iv }).toString(CryptoJS.enc.Utf8);
            if (!decrypted) {
                throw new Error('Failed to decrypt backup. Check your passphrase.');
            }
            const pair = {
                publicKey: backup.publicKey,
                privateKey: decrypted,
            };
            writeStoredPair(pair);
            if (register) {
                await this.registerPublicKey(pair.publicKey);
            }
            dispatchKeyChange(pair);
            return pair;
        },
        downloadBackup(backup, filename = `confession-key-${Date.now()}.json`) {
            const data = JSON.stringify(backup, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => URL.revokeObjectURL(url), 0);
        },
        readBackupFile(file) {
            if (!(file instanceof File)) {
                return Promise.reject(new Error('Select a valid backup file.'));
            }
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const json = JSON.parse(reader.result);
                        resolve(json);
                    } catch (error) {
                        reject(new Error('Backup file is not valid JSON.'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read the backup file.'));
                reader.readAsText(file);
            });
        },
    };

    window.ChatCrypto = ChatCrypto;

    document.addEventListener('DOMContentLoaded', () => {
        const statusEl = document.getElementById('key-status-text');
        const buttonEl = document.getElementById('generate-chat-key');
        if (!statusEl || !buttonEl) {
            return;
        }

        const renderStatus = () => {
            const pair = ChatCrypto.getKeyPair();
            if (pair) {
                statusEl.textContent = `Secure key ready (public: ${pair.publicKey.slice(0, 12)}…)`;
                buttonEl.textContent = 'Regenerate Secure Key';
            } else {
                statusEl.textContent = 'No secure chat key on this device.';
                buttonEl.textContent = 'Generate Secure Key';
            }
        };

        buttonEl.addEventListener('click', async () => {
            buttonEl.disabled = true;
            statusEl.textContent = 'Generating secure key…';
            try {
                await ChatCrypto.generateKeyPair();
                statusEl.textContent = 'Secure key generated and registered.';
            } catch (err) {
                console.error(err);
                statusEl.textContent = err.message || 'Failed to generate key.';
            } finally {
                renderStatus();
                buttonEl.disabled = false;
            }
        });

        renderStatus();
        document.addEventListener('chatcrypto:keychange', renderStatus);
    });
})(window, document);
