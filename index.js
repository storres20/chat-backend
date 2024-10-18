const express = require('express');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

const app = express();
const port = 3001;

// Load SSL certificate and private key from Let's Encrypt
const server = https.createServer({
    cert: fs.readFileSync('/etc/letsencrypt/live/chat.lonkansoft.pro/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/chat.lonkansoft.pro/privkey.pem')
}, app);

// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server running on https://chat.lonkansoft.pro:${port}`);
});

// Create a WebSocket server that uses the same HTTPS server
const wss = new WebSocket.Server({ server });

// List to store all connected users and their status
let connectedUsers = [];
// Store chat history in memory
let chatHistory = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const messageData = JSON.parse(message);

        // Handle setting the username when user joins the chat
        if (messageData.type === 'set_username' && messageData.username) {
            ws.username = messageData.username; // Attach the username to the WebSocket connection

            // Add user to connectedUsers if not already present
            if (!connectedUsers.some(user => user.username === ws.username)) {
                connectedUsers.push({ username: ws.username, status: 'online' });
            } else {
                // Mark user as online again if they re-enter the chat
                connectedUsers = connectedUsers.map(user =>
                    user.username === ws.username ? { ...user, status: 'online' } : user
                );
            }

            // Immediately broadcast the updated users list
            broadcastUsers();

            // Broadcast a system message that the user has joined or re-entered the chat
            broadcastMessage({ username: 'System', message: `${ws.username} has joined the chat.` });

            // Send the previous chat history to the user who just joined/re-entered
            ws.send(JSON.stringify({ type: 'history', data: chatHistory }));

        } else if (messageData.type === 'chat_message') {
            // Directly broadcast the message; it will be saved in chat history within broadcastMessage
            broadcastMessage(messageData);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');

        // Only broadcast "left the chat" message if the username is defined
        if (ws.username) {
            // Set the user's status to offline on disconnect
            connectedUsers = connectedUsers.map((user) =>
                user.username === ws.username ? { ...user, status: 'offline' } : user
            );

            // Broadcast the user leaving message
            broadcastMessage({ username: 'System', message: `${ws.username} has left the chat.` });

            // Broadcast the updated user list after disconnection
            broadcastUsers();
        }
    });

    const broadcastMessage = (messageData) => {
        // Store all messages, including system messages, in chat history
        chatHistory.push(messageData);

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', data: messageData }));
            }
        });
    };

    const broadcastUsers = () => {
        const onlineUsers = connectedUsers.filter(user => user.status === 'online');
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'users', data: onlineUsers }));
            }
        });
    };
});
