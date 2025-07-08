const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- Key Improvement: CORS Configuration ---
// This tells the server to accept connections from any origin.
// In a real production environment, you would restrict this to your specific
// front-end domain, like: origin: "https://www.your-chatapp.com"
const io = new Server(server, {
    cors: {
        origin: "*", // Allows access from any origin
        methods: ["GET", "POST"]
    }
});

// Serve the client files from the 'client' directory
app.use(express.static(path.join(__dirname, '../client')));

// In-memory store for users. This works for a single server instance.
// For scaling, this would be replaced by a shared store like Redis.
const users = {};

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // User registers with a username and their public RSA key
    socket.on('register', ({ username, publicKey }) => {
        // Simple check to prevent username conflicts
        if (users[username]) {
            // Optional: You could emit an error back to the client here
            console.log(`Username ${username} is already taken.`);
            return;
        }

        users[username] = {
            id: socket.id,
            publicKey: publicKey
        };
        // Store the username on the socket object for easy access on disconnect
        socket.username = username;
        console.log(`User registered: ${username} with socket ID ${socket.id}`);
        
        // Broadcast the updated list of online users to everyone
        io.emit('updateUserList', Object.keys(users));
    });

    // A user requests the public key of another user
    socket.on('requestPublicKey', (username) => {
        if (users[username]) {
            // Send the response only to the requesting socket
            socket.emit('publicKeyResponse', {
                username: username,
                publicKey: users[username].publicKey
            });
        }
    });

    // Forward the encrypted AES key to the target recipient
    socket.on('sendEncryptedKey', ({ to, encryptedKey }) => {
        const recipient = users[to];
        if (recipient) {
            // Emit to the specific socket ID of the recipient
            io.to(recipient.id).emit('receiveEncryptedKey', {
                from: socket.username,
                encryptedKey: encryptedKey,
            });
            console.log(`Relaying encrypted AES key from ${socket.username} to ${to}`);
        } else {
            console.log(`Attempted to send key to non-existent user: ${to}`);
        }
    });

    // Forward an encrypted message to the target recipient
    socket.on('sendMessage', ({ to, encryptedMessage }) => {
        const recipient = users[to];
        if (recipient) {
            // Emit to the specific socket ID of the recipient
            io.to(recipient.id).emit('receiveMessage', {
                from: socket.username,
                encryptedMessage: encryptedMessage,
            });
            console.log(`Relaying message from ${socket.username} to ${to}`);
        } else {
            console.log(`Attempted to send message to non-existent user: ${to}`);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        // Check if the user had registered before disconnecting
        if (socket.username && users[socket.username]) {
            console.log(`User disconnected: ${socket.username}`);
            delete users[socket.username];
            // Broadcast the new user list to all remaining clients
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
