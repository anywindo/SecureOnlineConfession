#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeCrypto = require('crypto');
const CryptoJS = require('crypto-js');
const elliptic = require('elliptic');

function createStorage() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
    };
}

function createDocument() {
    const events = {};
    const elements = {
        'key-status-text': {
            id: 'key-status-text',
            textContent: '',
            set text(val) {
                this.textContent = val;
            },
        },
        'generate-chat-key': {
            id: 'generate-chat-key',
            textContent: '',
            disabled: false,
            listeners: {},
            addEventListener(type, handler) {
                this.listeners[type] = this.listeners[type] || [];
                this.listeners[type].push(handler);
            },
            click() {
                (this.listeners.click || []).forEach((cb) => cb());
            },
        },
    };
    return {
        getElementById: (id) => elements[id] || null,
        addEventListener: (type, handler) => {
            events[type] = events[type] || [];
            events[type].push(handler);
            if (type === 'DOMContentLoaded') {
                setImmediate(() => handler());
            }
        },
        dispatchEvent: (event) => {
            (events[event.type] || []).forEach((handler) => handler(event));
        },
        createEvent: () => ({}),
    };
}

async function main() {
    const chatCryptoSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'chat-crypto.js'), 'utf8');

    const localStorage = createStorage();
    const sessionStorage = createStorage();
    const document = createDocument();

    function CustomEvent(type, init) {
        this.type = type;
        this.detail = init?.detail;
    }

    const randomSource = {
        getRandomValues: (typedArray) => {
            const buf = nodeCrypto.randomBytes(typedArray.length);
            typedArray.set(buf);
            return typedArray;
        },
    };

    const context = {
        window: {},
        CryptoJS,
        elliptic,
        document,
        console,
        fetch: async () => ({
            ok: true,
            async json() {
                return { success: true };
            },
        }),
        navigator: {},
        CustomEvent,
        localStorage,
        sessionStorage,
        crypto: nodeCrypto,
    };
    context.window = context;
    context.window.CryptoJS = CryptoJS;
    context.window.elliptic = elliptic;
    context.window.localStorage = localStorage;
    context.window.sessionStorage = sessionStorage;
    context.window.crypto = randomSource;
    context.window.msCrypto = randomSource;
    context.window.CustomEvent = CustomEvent;

    vm.createContext(context);
    vm.runInContext(chatCryptoSrc, context);

    const { ChatCrypto } = context.window;
    if (!ChatCrypto) {
        throw new Error('ChatCrypto not exposed on window');
    }

    const pair = await ChatCrypto.generateKeyPair({ register: true });
    if (!pair.privateKey || !pair.publicKey) {
        throw new Error('Key generation failed');
    }

    const ec = new elliptic.ec('p256');
    const recipient = ec.genKeyPair();
    const recipientPublic = recipient.getPublic(false, 'hex');
    const encrypted = ChatCrypto.encryptMessage('hello world', recipientPublic);
    const decrypted = ChatCrypto.decryptMessage(
        encrypted.ciphertextB64,
        encrypted.senderPublicKey,
        recipient.getPrivate('hex')
    );

    if (decrypted !== 'hello world') {
        throw new Error('Decryption check failed');
    }

    console.log('ChatCrypto smoke test passed.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
