const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the client files
app.use(express.static(path.join(__dirname, '../client')));

// In-memory store for users and their public keys.
// In a real app, this would be a secure database.
const users = {};

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // User registers with a username and their public RSA key
    socket.on('register', ({ username, publicKey }) => {
        users[username] = {
            id: socket.id,
            publicKey: publicKey
        };
        socket.username = username;
        console.log(`User registered: ${username}`);
        // Broadcast the updated list of online users
        io.emit('updateUserList', Object.keys(users));
    });

    // A user requests the public key of another user to start a secure chat
    socket.on('requestPublicKey', (username) => {
        if (users[username]) {
            socket.emit('publicKeyResponse', {
                username: username,
                publicKey: users[username].publicKey
            });
        }
    });

    // Forward the encrypted AES key to the recipient
    socket.on('sendEncryptedKey', ({ to, encryptedKey }) => {
        const recipientSocket = io.sockets.sockets.get(users[to]?.id);
        if (recipientSocket) {
            recipientSocket.emit('receiveEncryptedKey', {
                from: socket.username,
                encryptedKey: encryptedKey,
            });
            console.log(`Relaying encrypted AES key from ${socket.username} to ${to}`);
        }
    });

    // Forward an encrypted message to the recipient
    socket.on('sendMessage', ({ to, encryptedMessage }) => {
        const recipientSocket = io.sockets.sockets.get(users[to]?.id);
        if (recipientSocket) {
            recipientSocket.emit('receiveMessage', {
                from: socket.username,
                encryptedMessage: encryptedMessage,
            });
            console.log(`Relaying encrypted message from ${socket.username} to ${to}`);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        if (socket.username && users[socket.username]) {
            console.log(`User disconnected: ${socket.username}`);
            delete users[socket.username];
            io.emit('updateUserList', Object.keys(users));
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});