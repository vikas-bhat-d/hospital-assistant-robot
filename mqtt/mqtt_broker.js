const aedes = require('aedes')();
const net = require('net');
const http = require('http');
const ws = require('ws');

// -------------------------
// MQTT TCP SERVER (port 1883)
// -------------------------
const TCP_PORT = 1883;

const tcpServer = net.createServer(aedes.handle);

tcpServer.listen(TCP_PORT, function () {
  console.log(`🚀 MQTT TCP Broker running on port ${TCP_PORT}`);
});

// -------------------------
// MQTT WEBSOCKET SERVER (port 9001)
// -------------------------
const WS_PORT = 9001;

const httpServer = http.createServer();
const wsServer = new ws.Server({ server: httpServer });

wsServer.on('connection', function (socket) {
  const stream = ws.createWebSocketStream(socket);
  aedes.handle(stream);
});

httpServer.listen(WS_PORT, function () {
  console.log(`🌐 MQTT WebSocket server running on ws://localhost:${WS_PORT}`);
});

// -------------------------
// MQTT EVENTS
// -------------------------
aedes.on('client', (client) => {
  console.log(`✨ Client Connected: ${client?.id}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`❌ Client Disconnected: ${client?.id}`);
});

aedes.on('publish', async (packet, client) => {
  if (client) {
    console.log(`📩 Message from ${client.id}: ${packet.payload.toString()}`);
    console.log(`📌 Topic: ${packet.topic}`);
  }
});
