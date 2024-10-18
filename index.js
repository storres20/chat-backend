const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = 3001;

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// List to store all connected users and their status
let connectedUsers = [];
// Store chat history in memory
let chatHistory = [];

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
                // Broadcast a system message that the user has joined
                broadcastMessage({ username: 'System', message: `${ws.username} has joined the chat.` });
            } else {
                // Mark user as online again if they re-enter the chat
                connectedUsers = connectedUsers.map(user =>
                    user.username === ws.username ? { ...user, status: 'online' } : user
                );
            }
        }

        // Store messages in chat history (excluding system messages)
        if (messageData.username !== 'System') {
            chatHistory.push(messageData);
        }

        // Broadcast the updated user list and chat history to the current user
        broadcastUsers();
        broadcastMessage(messageData);
    });

    // Send chat history when a user connects
    ws.send(JSON.stringify({ type: 'history', data: chatHistory }));

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
