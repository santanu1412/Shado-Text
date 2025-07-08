// client/client.js (Modified to include Chat History)

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
    const sessionKeys = {}; // { username: 'aes_key_string' }
    
    // --- MODIFICATION 1: The "Notebook" for all chat histories ---
    const chatHistories = {}; // { username: [ { sender, message, type }, ... ] }

    // --- UTILITY FUNCTIONS ---

    function displayMessage(sender, message, type) {
        // Remove status message if it's the first message in a chat
        const statusMessage = messagesDiv.querySelector('.status-message');
        if (statusMessage) statusMessage.remove();

        const messageElement = document.createElement('div');
        // The original HTML structure uses .sent/.received for styling, let's keep that.
        const messageType = (sender === currentUser) ? 'sent' : 'received';
        messageElement.classList.add('message', messageType);

        // Using the new HTML structure for messages with timestamp
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `<span>${message}</span><small>${time}</small>`;
        
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function displayStatus(message) {
        messagesDiv.innerHTML = `<div class="status-message">${message}</div>`;
    }

    // --- CRYPTOGRAPHY FUNCTIONS (Your functions are perfect, no changes here) ---

    function generateRSAKeys() {
        const crypt = new JSEncrypt({ default_key_size: 2048 });
        return { privateKey: crypt.getPrivateKey(), publicKey: crypt.getPublicKey() };
    }
    function generateAESKey() {
        return CryptoJS.lib.WordArray.random(32).toString();
    }
    function rsaEncrypt(text, publicKey) {
        const crypt = new JSEncrypt();
        crypt.setPublicKey(publicKey);
        return crypt.encrypt(text);
    }
    function rsaDecrypt(encryptedText, privateKey) {
        const crypt = new JSEncrypt();
        crypt.setPrivateKey(privateKey);
        return crypt.decrypt(encryptedText);
    }
    function aesEncrypt(text, key) {
        return CryptoJS.AES.encrypt(text, key).toString();
    }
    function aesDecrypt(encryptedText, key) {
        const bytes = CryptoJS.AES.decrypt(encryptedText, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    // --- EVENT LISTENERS ---

    registerBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            currentUser = username;
            rsaKeys = generateRSAKeys();
            socket.emit('register', { username: currentUser, publicKey: rsaKeys.publicKey });
            registrationView.classList.add('hidden');
            chatView.classList.remove('hidden'); 
            chatView.style.display = 'flex'; // Ensure flex layout is applied
            currentUserSpan.textContent = currentUser;
        }
    });

    sendBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        const aesKey = sessionKeys[activeChatPartner];

        if (message && activeChatPartner && aesKey) {
            const encryptedMessage = aesEncrypt(message, aesKey);
            socket.emit('sendMessage', { to: activeChatPartner, encryptedMessage });

            // Display message locally and SAVE to history
            displayMessage(currentUser, message, 'sent');
            chatHistories[activeChatPartner].push({ sender: currentUser, message, type: 'sent' });

            messageInput.value = '';
        }
    });
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    // --- SOCKET.IO EVENT HANDLERS ---

    socket.on('updateUserList', (users) => {
        userList.innerHTML = '';
        users.forEach(user => {
            if (user !== currentUser) {
                const li = document.createElement('li');
                // MODIFICATION: Add a data attribute for easy selection
                li.dataset.username = user;
                // Using the icon/span structure from the new HTML
                li.innerHTML = `<i class="fa-solid fa-circle"></i><span>${user}</span><span class="notification-badge hidden"></span>`;

                li.addEventListener('click', () => {
                    const newPartner = user;
                    // --- MODIFICATION 2: This is the core logic for switching chats ---
                    if (newPartner === activeChatPartner) return; // Don't re-load the same chat

                    activeChatPartner = newPartner;

                    // Update UI
                    document.querySelectorAll('#user-list li').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                    chatPartnerSpan.textContent = user;
                    
                    // Hide notification badge on click
                    li.querySelector('.notification-badge').classList.add('hidden');

                    // Clear previous chat and load history
                    messagesDiv.innerHTML = '';
                    if (chatHistories[activeChatPartner] && chatHistories[activeChatPartner].length > 0) {
                        // Load and display all messages from history
                        chatHistories[activeChatPartner].forEach(msg => {
                            displayMessage(msg.sender, msg.message, msg.type);
                        });
                    } else {
                        // It's a new chat, initialize history
                        chatHistories[activeChatPartner] = [];
                        displayStatus(`This is the beginning of your secure chat with ${user}.`);
                    }

                    // Establish secure session if it doesn't exist
                    if (!sessionKeys[activeChatPartner]) {
                        displayStatus(`Starting secure chat with ${user}. Generating session key...`);
                        socket.emit('requestPublicKey', user);
                    } else {
                         // Session already exists, enable input
                        messageInput.disabled = false;
                        sendBtn.disabled = false;
                        messageInput.focus();
                    }
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
            
            // Now that keys are exchanged, enable input
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
        }
    });

    socket.on('receiveEncryptedKey', ({ from, encryptedKey }) => {
        const aesKey = rsaDecrypt(encryptedKey, rsaKeys.privateKey);
        if (aesKey) {
            sessionKeys[from] = aesKey;
            // If the user who sent the key is our active partner, enable chat
            if (from === activeChatPartner) {
                displayStatus(`Secure session with ${from} established. You can now chat.`);
                messageInput.disabled = false;
                sendBtn.disabled = false;
                messageInput.focus();
            }
        }
    });

    socket.on('receiveMessage', ({ from, encryptedMessage }) => {
        const aesKey = sessionKeys[from];
        if (aesKey) {
            const decryptedMessage = aesDecrypt(encryptedMessage, aesKey);

            // --- MODIFICATION 3: Smartly handle incoming messages ---

            // Ensure history exists for this user
            if (!chatHistories[from]) {
                chatHistories[from] = [];
            }
            // Save the received message to their history
            chatHistories[from].push({ sender: from, message: decryptedMessage, type: 'received' });

            if (from === activeChatPartner) {
                // If we are actively chatting with them, display it immediately
                displayMessage(from, decryptedMessage, 'received');
            } else {
                // If it's a background chat, show a notification badge
                const userLi = document.querySelector(`#user-list li[data-username='${from}']`);
                if (userLi) {
                    const badge = userLi.querySelector('.notification-badge');
                    badge.classList.remove('hidden');
                    // Optional: update badge count
                    // badge.textContent = (parseInt(badge.textContent) || 0) + 1;
                }
            }
        }
    });
});
