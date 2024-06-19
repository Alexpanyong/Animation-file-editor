const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Store connected clients
const clients = new Set();

// Shared animation state
let currentAnimationState = {
    // ... initial animation data ...
};

// Object to store latest timestamps for properties/layers
const latestTimestamps = {};

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');

    // Send initial animation state to the new client
    ws.send(JSON.stringify({
        type: 'setAnimation',
        payload: currentAnimationState
    }));

    ws.on('message', (message) => {
        console.log('Received:', message);

        try {
            const parsedMessage = JSON.parse(message.toString());

            // Check message type and handle accordingly
            switch (parsedMessage.type) {
                case 'propertyChange':
                    const { layerIndex, propertyName, timestamp } = parsedMessage.payload;
                    const latestTimestamp = latestTimestamps[`${layerIndex}-${propertyName}`];
                    if (!latestTimestamp || timestamp > latestTimestamp) {
                        // Update shared state and broadcast
                        currentAnimationState.layers[layerIndex].ks[propertyName].k[0].s = parsedMessage.payload.newValue;
                        latestTimestamps[`${layerIndex}-${propertyName}`] = timestamp;
                        // Broadcast the property change message to all clients (including the sender)
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(message);
                            }
                        });
                    }
                    break;
                case 'layerAdded':
                case 'layerDeleted':
                case 'layerReordered':
                    // Broadcast the layer change message to other clients
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                    break;
                case 'updateScrubberPosition':
                    // Broadcast the scrubber position change message to all clients (including the sender)
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                    break;
                default:
                    console.error('Unknown message type:', parsedMessage.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});
