const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = 3001;

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// List to store all connected usernames
let connectedUsers = [];

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const messageData = JSON.parse(message);

        // When a new user joins, add them to the connectedUsers list
        if (messageData.username !== 'System' && !connectedUsers.includes(messageData.username)) {
            connectedUsers.push(messageData.username);
        }

        // Broadcast the list of connected users to all clients
        broadcastUsers();

        // Broadcast the message to all clients
        broadcastMessage(messageData);
    });

    ws.on('close', () => {
        console.log('Client disconnected');

        // Remove the disconnected user from the connectedUsers list
        connectedUsers = connectedUsers.filter((user) => user !== ws.username);

        // Broadcast the updated user list after someone disconnects
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
