// client/client.js (Corrected Version)

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Views
    const registrationView = document.getElementById('registration-view');
    const chatView = document.getElementById('chat-view');

    // Registration elements
    const usernameInput = document.getElementById('username-input');
    const registerBtn = document.getElementById('register-btn');

    // Chat elements
    const currentUserSpan = document.getElementById('current-user');
    const userList = document.getElementById('user-list');
    const chatPartnerSpan = document.getElementById('chat-partner');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    // App state
    let currentUser = '';
    let rsaKeys = {};
    let activeChatPartner = '';
    // Store AES keys for each chat partner
    const sessionKeys = {}; // { username: 'aes_key_string' }

    // --- UTILITY FUNCTIONS ---
    function displayMessage(sender, message, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type); // 'sent' or 'received'

        const senderElement = document.createElement('div');
        senderElement.classList.add('message-sender');
        senderElement.textContent = sender;

        messageElement.appendChild(senderElement);
        messageElement.append(message);
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function displayStatus(message) {
        messagesDiv.innerHTML = `<div class="status-message">${message}</div>`;
    }

    // --- CRYPTOGRAPHY FUNCTIONS ---

    // Generate a 2048-bit RSA key pair
    function generateRSAKeys() {
        const crypt = new JSEncrypt({ default_key_size: 2048 });
        return {
            privateKey: crypt.getPrivateKey(),
            publicKey: crypt.getPublicKey()
        };
    }

    // Generate a random 256-bit AES key
    function generateAESKey() {
        return CryptoJS.lib.WordArray.random(32).toString(); // 32 bytes = 256 bits
    }

    // Encrypt text with RSA public key
    function rsaEncrypt(text, publicKey) {
        const crypt = new JSEncrypt();
        crypt.setPublicKey(publicKey);
        return crypt.encrypt(text);
    }

    // Decrypt text with RSA private key
    function rsaDecrypt(encryptedText, privateKey) {
        const crypt = new JSEncrypt();
        crypt.setPrivateKey(privateKey);
        return crypt.decrypt(encryptedText);
    }

    // Encrypt text with AES key
    function aesEncrypt(text, key) {
        return CryptoJS.AES.encrypt(text, key).toString();
    }

    // Decrypt text with AES key
    function aesDecrypt(encryptedText, key) {
        const bytes = CryptoJS.AES.decrypt(encryptedText, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    // --- EVENT LISTENERS ---

    // Register user
    registerBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            currentUser = username;
            rsaKeys = generateRSAKeys();
            
            socket.emit('register', { username: currentUser, publicKey: rsaKeys.publicKey });

            // ** FIX IS HERE: Use classList to control visibility **
            registrationView.classList.add('hidden');
            chatView.classList.remove('hidden'); 
            
            currentUserSpan.textContent = currentUser;
        }
    });

    // Send a message
    sendBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        const aesKey = sessionKeys[activeChatPartner];

        if (message && activeChatPartner && aesKey) {
            const encryptedMessage = aesEncrypt(message, aesKey);
            socket.emit('sendMessage', { to: activeChatPartner, encryptedMessage });

            displayMessage(currentUser, message, 'sent');
            messageInput.value = '';
        }
    });
    
    // Allow sending with Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });

    // --- SOCKET.IO EVENT HANDLERS ---

    socket.on('updateUserList', (users) => {
        userList.innerHTML = '';
        users.forEach(user => {
            if (user !== currentUser) {
                const li = document.createElement('li');
                li.textContent = user;
                li.addEventListener('click', async () => {
                    activeChatPartner = user;
                    
                    document.querySelectorAll('#user-list li').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                    chatPartnerSpan.textContent = user;
                    messageInput.disabled = false;
                    sendBtn.disabled = false;
                    
                    displayStatus(`Starting secure chat with ${user}. Generating session key...`);
                    socket.emit('requestPublicKey', user);
                });
                userList.appendChild(li);
            }
        });
    });
    
    socket.on('publicKeyResponse', ({ username, publicKey }) => {
        if (username === activeChatPartner) {
            const aesKey = generateAESKey();
            sessionKeys[username] = aesKey;
            
            const encryptedKey = rsaEncrypt(aesKey, publicKey);
            
            socket.emit('sendEncryptedKey', { to: username, encryptedKey });
            
            displayStatus(`Secure session with ${username} established. You can now chat.`);
        }
    });

    socket.on('receiveEncryptedKey', ({ from, encryptedKey }) => {
        const aesKey = rsaDecrypt(encryptedKey, rsaKeys.privateKey);
        if (aesKey) {
            sessionKeys[from] = aesKey;
            activeChatPartner = from;
            
            document.querySelectorAll('#user-list li').forEach(item => {
                item.classList.remove('active');
                if(item.textContent === from) {
                    item.classList.add('active');
                }
            });
            chatPartnerSpan.textContent = from;
            messageInput.disabled = false;
            sendBtn.disabled = false;

            displayStatus(`Secure session with ${from} established. You can now chat.`);
        } else {
            displayStatus(`Could not establish secure session with ${from}.`);
        }
    });

    socket.on('receiveMessage', ({ from, encryptedMessage }) => {
        const aesKey = sessionKeys[from];
        if (aesKey) {
            const decryptedMessage = aesDecrypt(encryptedMessage, aesKey);
            if (from === activeChatPartner) {
                displayMessage(from, decryptedMessage, 'received');
            } else {
                console.log(`Received message from ${from}, but they are not the active chat.`);
            }
        }
    });
});