const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = 3001;

// Start the HTTP server
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Create a WebSocket server that uses the same HTTP server
const wss = new WebSocket.Server({ server });

// List to store all connected users and their status
let connectedUsers = [];
// Store chat history in memory
let chatHistory = [];

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
            // Store chat messages in chat history (excluding system messages)
            if (messageData.username !== 'System') {
                chatHistory.push(messageData);
            }
            // Broadcast the updated chat history and messages
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
