const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

let remainingShelfLifeHours = 48.0;
const E_a = 63000;
const R = 8.314;
const Ref_Temp = 277.15;

function calculateDecayMultiplier(tempC) {
    const currentTempK = tempC + 273.15;
    return Math.exp((E_a / R) * ((1 / Ref_Temp) - (1 / currentTempK)));
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const accelerationFactor = calculateDecayMultiplier(data.temperature);
            const timeElapsedHours = (2 / 3600) * accelerationFactor;
            remainingShelfLifeHours = Math.max(0, remainingShelfLifeHours - timeElapsedHours);

            const enrichedPayload = {
                ...data,
                spoilage_factor: accelerationFactor.toFixed(2),
                remaining_shelf_life_hrs: remainingShelfLifeHours.toFixed(2),
                viability_percentage: ((remainingShelfLifeHours / 48.0) * 100).toFixed(1),
                alert_status: data.temperature > 8.0 ? 'CRITICAL' : (data.temperature > 4.0 ? 'WARNING' : 'NORMAL')
            };

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(enrichedPayload));
                }
            });
        } catch (err) {
            console.error('Error:', err);
        }
    });
});

const PORT = 8000;
server.listen(PORT, () => {
    console.log(`\n🚀 AuraChain Server running on http://localhost:${PORT}`);
});