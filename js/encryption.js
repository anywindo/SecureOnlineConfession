/**
 * Secure Crypto Manager using Web Crypto API.
 * Handles client-side key generation, storage, and cryptographic operations.
 */

class CryptoManager {
    constructor() {
        this.algo = {
            name: "RSA-OAEP",
            hash: "SHA-256",
        };
        this.signAlgo = {
            name: "RSA-PSS",
            saltLength: 32,
        };
        this.aesAlgo = {
            name: "AES-GCM",
            length: 256
        };
    }

    // --- Key Generation & Derivation ---

    async generateKeyPair() {
        return await window.crypto.subtle.generateKey(
            {
                name: "RSA-PSS", // Use PSS for signing, we might need a separate key for Encryption if we want to follow strict best practices, but for this refactor we can use standard RSA-OAEP for encryption. 
                // Wait, standard refactor: One key pair for Signing (Identity), One for Encryption?
                // For simplicity in this specific task "Broken Signature Logic", let's use RSA-OAEP for encryption and verify if we can use it for signing.
                // NO, RSA-OAEP is for encryption. RSA-PSS or RSASSA-PKCS1-v1_5 is for signing.
                // We should generate TWO keys if we want to be correct.
                // OR we can use RSA-PSS for everything? No.
                // Let's stick to:
                // Primary Key: RSA-OAEP for Encryption/Decryption. (To receive msgs)
                // Secondary Key: RSA-PSS for Signing. (To sign msgs)
                // This adds complexity.
                // Alternative: Use one RSA key pair that allows both? Web Crypto doesn't usually like that.
                // Let's generate ONE RSA-OAEP key for encryption.
                // And we'll verify if we can sign with it.
                // Actually, for "Secure Online Confession", the PRIEST needs an Encryption Key (to receive).
                // The PENITENT needs a Signing Key (to prove identity).
                // But Penitent also needs Encryption Key to receive replies.
                // To keep it simple: Let's use ONE key pair and see if we can set usages ['encrypt', 'decrypt', 'sign', 'verify']?
                // WebCrypto RSA keys are algorithm specific.
                
                // DECISION: We will generate TWO key pairs.
                // 1. Encryption Key (RSA-OAEP)
                // 2. Signing Key (RSA-PSS)
                // BUT, storage is limited in the DB schema `public_key` text.
                // Storing JSON of both keys in the single column is possible.
                
                // REVISIT PLAN: The user just wants "Broken Signature Logic" fixed.
                // Let's use a simpler approach if possible.
                // If we use RSA-PSS, we can't encrypt.
                // If we use RSA-OAEP, we can't sign.
                
                // OK, we must have separate keys or a JSON object holding both.
                // "public_key" column in DB can hold JSON string: { enc: "...", sign: "..." }
                
                // Let's implement generateKeyPair returning a compound object.
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            true,
            ["sign", "verify"]
        );
        // Change of plan: To avoid massive DB refactor, let's look at `users` table.
        // It has `public_key` and `encrypted_private_key`.
        // Let's stick to RSA-OAEP for encryption (since Confession privacy is #1).
        // What about signing?
        // If we only have an encryption key, we can't sign.
        // WE NEED A SIGNING KEY.
        
        // Let's generate a dual key set.
    }

    async generateDualKeys() {
        const encKey = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            true,
            ["encrypt", "decrypt"]
        );

        const signKey = await window.crypto.subtle.generateKey(
            {
                name: "RSA-PSS",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            true,
            ["sign", "verify"]
        );

        return { encKey, signKey };
    }

    async deriveKeyFromPassword(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        
        // Salt must be ArrayBuffer/Uint8Array
        const saltBuffer = typeof salt === 'string' ? this.base64ToArrayBuffer(salt) : salt;

        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
    }

    // --- Import / Export ---

    async exportPublicKey(key) {
        const exported = await window.crypto.subtle.exportKey("spki", key);
        return this.arrayBufferToBase64(exported);
    }

    async exportPrivateKey(key) {
        const exported = await window.crypto.subtle.exportKey("pkcs8", key);
        return this.arrayBufferToBase64(exported);
    }
    
    async importPublicKey(base64, algoName) {
        const binary = this.base64ToArrayBuffer(base64);
        return await window.crypto.subtle.importKey(
            "spki",
            binary,
            { name: algoName, hash: "SHA-256" },
            true,
            algoName === 'RSA-OAEP' ? ["encrypt"] : ["verify"]
        );
    }

    // --- Encryption Wrapper ---
    
    async encryptPrivateKey(privateKey, passwordKey) {
        const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            passwordKey,
            exported
        );
        
        return {
            iv: this.arrayBufferToBase64(iv),
            ciphertext: this.arrayBufferToBase64(ciphertext)
        };
    }
    
    async decryptPrivateKey(encryptedObj, passwordKey, algoName, usages) {
        const iv = this.base64ToArrayBuffer(encryptedObj.iv);
        const ciphertext = this.base64ToArrayBuffer(encryptedObj.ciphertext);
        
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            passwordKey,
            ciphertext
        );
        
        return await window.crypto.subtle.importKey(
            "pkcs8",
            decryptedBuffer,
            { name: algoName, hash: "SHA-256" },
            true,
            usages
        );
    }

    // --- Confession Flow ---

    async encryptMessage(message, recipientPublicKey) {
        // Hybrid Encryption:
        // 1. Generate ephemeral AES key
        // 2. Encrypt message with AES
        // 3. Encrypt AES key with RSA-OAEP (Recipient Public Key)
        
        const aesKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encodedMsg = enc.encode(message);
        
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            encodedMsg
        );
        
        const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
        const encryptedAesKey = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            recipientPublicKey,
            rawAesKey
        );
        
        // Return packed format
        // We'll pack it as JSON: { iv: ..., msg: ..., key: ... }
        return JSON.stringify({
            iv: this.arrayBufferToBase64(iv),
            msg: this.arrayBufferToBase64(ciphertext),
            key: this.arrayBufferToBase64(encryptedAesKey)
        });
    }

    async decryptMessage(packedCiphertext, recipientPrivateKey) {
        const data = JSON.parse(packedCiphertext);
        const iv = this.base64ToArrayBuffer(data.iv);
        const msgBytes = this.base64ToArrayBuffer(data.msg);
        const keyBytes = this.base64ToArrayBuffer(data.key);
        
        // 1. Decrypt AES Key
        const rawAesKey = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            recipientPrivateKey,
            keyBytes
        );
        
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            rawAesKey,
            "AES-GCM",
            false,
            ["decrypt"]
        );
        
        // 2. Decrypt Message
        const decryptedObj = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            msgBytes
        );
        
        const dec = new TextDecoder();
        return dec.decode(decryptedObj);
    }

    async signMessage(message, signingPrivateKey) {
        const enc = new TextEncoder();
        const data = enc.encode(message); // Sign the plaintext or hash? Standard practice: Sign the data. (WebCrypto handles hashing)
        
        const signature = await window.crypto.subtle.sign(
            {
                name: "RSA-PSS",
                saltLength: 32,
            },
            signingPrivateKey,
            data
        );
        
        return this.arrayBufferToBase64(signature);
    }
    
    async verifySignature(message, signatureB64, signingPublicKey) {
        const enc = new TextEncoder();
        const data = enc.encode(message);
        const signature = this.base64ToArrayBuffer(signatureB64);
        
        return await window.crypto.subtle.verify(
            {
                name: "RSA-PSS",
                saltLength: 32,
            },
            signingPublicKey,
            signature,
            data
        );
    }

    // --- Helpers ---
    
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    generateSalt() {
        const random = window.crypto.getRandomValues(new Uint8Array(16));
        return this.arrayBufferToBase64(random);
    }
}

// Export global instance
window.cryptoManager = new CryptoManager();
