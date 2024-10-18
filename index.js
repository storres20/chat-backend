const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = 3001;

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// List to store all connected users and their status
let connectedUsers = [];

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const messageData = JSON.parse(message);

        // Handle new user joining the chat
        if (messageData.username !== 'System') {
            ws.username = messageData.username; // Attach the username to the WebSocket connection

            // Add user to connectedUsers if not already present
            if (!connectedUsers.some(user => user.username === ws.username)) {
                connectedUsers.push({ username: ws.username, status: 'online' });
            }
        }

        // Broadcast updated user list to all clients
        broadcastUsers();

        // Broadcast the message to all clients
        broadcastMessage(messageData);
    });

    ws.on('close', () => {
        console.log('Client disconnected');

        // Set the user's status to offline on disconnect
        connectedUsers = connectedUsers.map((user) =>
            user.username === ws.username ? { ...user, status: 'offline' } : user
        );

        // Broadcast the updated user list after disconnection
        broadcastUsers();
    });

    const broadcastMessage = (messageData) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', data: messageData }));
            }
        });
    };

    const broadcastUsers = () => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'users', data: connectedUsers }));
            }
        });
    };
});
