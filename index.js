const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = 3001;

// Start the HTTP server
const server = app.listen(port, () => {
    console.log(`Server running on http://chat.website101.xyz:${port}`);
});

// Create a WebSocket server that uses the same HTTP server
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
            const joinMessage = {
                username: 'System',
                message: `${ws.username} has joined the chat.`,
                timestamp: new Date().toISOString() // Add timestamp
            };

            console.log('Broadcasting join message with timestamp:', joinMessage.timestamp); // Log timestamp
            broadcastMessage(joinMessage);

            // Send the previous chat history to the user who just joined/re-entered
            ws.send(JSON.stringify({ type: 'history', data: chatHistory }));

        } else if (messageData.type === 'chat_message') {
            // Directly broadcast the message; it will be saved in chat history within broadcastMessage
            const userMessage = {
                ...messageData,
                timestamp: new Date().toISOString() // Add timestamp
            };

            console.log('Broadcasting user message with timestamp:', userMessage.timestamp); // Log timestamp
            broadcastMessage(userMessage);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');

        if (ws.username) {
            // Set the user's status to offline on disconnect
            connectedUsers = connectedUsers.map((user) =>
                user.username === ws.username ? { ...user, status: 'offline' } : user
            );

            // Broadcast the user leaving message
            const leaveMessage = {
                username: 'System',
                message: `${ws.username} has left the chat.`,
                timestamp: new Date().toISOString() // Add timestamp
            };

            console.log('Broadcasting leave message with timestamp:', leaveMessage.timestamp); // Log timestamp
            broadcastMessage(leaveMessage);

            // Broadcast the updated user list after disconnection
            broadcastUsers();
        }
    });

    // Broadcast message to all clients and store in chat history with timestamp
    const broadcastMessage = (messageData) => {
        // Add the message to the chat history
        chatHistory.push(messageData);

        // Send the message to all connected clients
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
