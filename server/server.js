const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '../client')));


const users = {};

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    
    socket.on('register', ({ username, publicKey }) => {
        // Simple check to prevent username conflicts
        if (users[username]) {
            
            console.log(`Username ${username} is already taken.`);
            return;
        }

        users[username] = {
            id: socket.id,
            publicKey: publicKey
        };
        socket.username = username;
        console.log(`User registered: ${username} with socket ID ${socket.id}`);
        io.emit('updateUserList', Object.keys(users));
    });
    socket.on('requestPublicKey', (username) => {
        if (users[username]) {
            // Send the response only to the requesting socket
            socket.emit('publicKeyResponse', {
                username: username,
                publicKey: users[username].publicKey
            });
        }
    });
    socket.on('sendEncryptedKey', ({ to, encryptedKey }) => {
        const recipient = users[to];
        if (recipient) {
    
            io.to(recipient.id).emit('receiveEncryptedKey', {
                from: socket.username,
                encryptedKey: encryptedKey,
            });
            console.log(`Relaying encrypted AES key from ${socket.username} to ${to}`);
        } else {
            console.log(`Attempted to send key to non-existent user: ${to}`);
        }
    });

    
    socket.on('sendMessage', ({ to, encryptedMessage }) => {
        const recipient = users[to];
        if (recipient) {

            io.to(recipient.id).emit('receiveMessage', {
                from: socket.username,
                encryptedMessage: encryptedMessage,
            });
            console.log(`Relaying message from ${socket.username} to ${to}`);
        } else {
            console.log(`Attempted to send message to non-existent user: ${to}`);
        }
    });


    socket.on('disconnect', () => {
        if (socket.username && users[socket.username]) {
            console.log(`User disconnected: ${socket.username}`);
            delete users[socket.username];
            io.emit('updateUserList', Object.keys(users));
        } else {
            console.log(`An anonymous user disconnected: ${socket.id}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
