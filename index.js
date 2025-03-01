const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const port = process.env.PORT || 3001;

// Create HTTP server (Railway provides SSL)
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const messageData = JSON.parse(message);
        console.log('Received message:', messageData);

        // Broadcast the message
        broadcastMessage(messageData);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    const broadcastMessage = (messageData) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(messageData));
            }
        });
    };
});

// Listen on Railway-assigned port
server.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});
