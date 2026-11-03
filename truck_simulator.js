const WebSocket = require('ws');
const readline = require('readline');

const ROUTE = [
    { name: "Phaltan Hub", lat: 17.9866, lng: 74.4330 },
    { name: "Lonand Checkpoint", lat: 18.0500, lng: 74.3000 },
    { name: "Saswad Bypass", lat: 18.2700, lng: 74.1900 },
    { name: "Pune Plant", lat: 18.5204, lng: 73.8567 }
];

let temperature = 3.5;
let compressorFailure = false;

const ws = new WebSocket('ws://localhost:8000');

ws.on('open', () => {
    console.log("🚛 Telemetry Stream Connected!");
    console.log("👉 Press [ENTER] in this terminal at any time to TOGGLE a Cooling Compressor Failure!\n");

    let routeIdx = 0;
    setInterval(() => {
        if (compressorFailure) {
            temperature += (Math.random() * 0.6 + 0.8);
        } else {
            temperature = Number((3.5 + (Math.random() * 0.5 - 0.2)).toFixed(2));
        }

        const location = ROUTE[Math.min(routeIdx, ROUTE.length - 1)];

        const payload = {
            truck_id: "MH-11-GC-2026",
            temperature: Number(temperature.toFixed(2)),
            humidity: Number((Math.random() * 5 + 81).toFixed(1)),
            location_name: location.name,
            lat: location.lat,
            lng: location.lng,
            compressor_status: compressorFailure ? "FAULT" : "OK"
        };

        ws.send(JSON.stringify(payload));
        console.log(`📡 Sent: ${payload.temperature}°C | Loc: ${payload.location_name} | Status: ${payload.compressor_status}`);

        routeIdx = (routeIdx + 1) % ROUTE.length;
    }, 2000);
});

ws.on('error', (err) => {
    console.error("❌ Connection error. Make sure 'node server.js' is running first!");
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', () => {
    compressorFailure = !compressorFailure;
    const status = compressorFailure ? "CRITICAL FAIL (>4°C)" : "NORMAL (3.5°C)";
    console.log(`\n⚠️  [MANUAL TRIGGER] COMPRESSOR STATE SWITCHED TO: ${status}\n`);
});