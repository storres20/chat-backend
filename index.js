const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const port = process.env.PORT || 3001;

// Create HTTP server (Railway provides SSL)
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected users
let connectedUsers = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const messageData = JSON.parse(message);
        console.log('Received message:', messageData);

        // Handle user setting username
        if (messageData.type === 'set_username') {
            ws.username = messageData.username;

            if (!connectedUsers.includes(ws.username)) {
                connectedUsers.push(ws.username);
            }

            // Broadcast updated users list
            broadcastUsers();

            // Broadcast system message that user joined
            broadcastMessage({
                type: 'chat_message',
                username: 'System',
                message: `${ws.username} has joined the chat.`,
                timestamp: new Date().toISOString()
            });

        } else if (messageData.type === 'chat_message') {
            // Broadcast chat message to all clients
            broadcastMessage({
                type: 'chat_message',
                username: messageData.username,
                message: messageData.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');

        if (ws.username) {
            // Remove user from connected list
            connectedUsers = connectedUsers.filter(user => user !== ws.username);

            // Broadcast updated users list
            broadcastUsers();

            // Broadcast system message that user left
            broadcastMessage({
                type: 'chat_message',
                username: 'System',
                message: `${ws.username} has left the chat.`,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Function to broadcast messages to all clients
const broadcastMessage = (messageData) => {
    console.log("Broadcasting message:", messageData);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(messageData));
        }
    });
};

// Function to broadcast updated users list
const broadcastUsers = () => {
    const usersList = {
        type: "users",
        data: connectedUsers.map(username => ({ username }))
    };

    console.log("Broadcasting users:", usersList);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(usersList));
        }
    });
};

// Start server on Railway-assigned port
server.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});
