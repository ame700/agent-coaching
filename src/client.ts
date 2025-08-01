// client.ts
import WebSocket from 'ws';

// Replace this with the actual port your server runs on
const PORT = 8081;
const conversationId = 'test-session-1234'; // Change this if needed

const ws = new WebSocket(`ws://localhost:${PORT}`, {
  headers: {
    'User-Agent': 'genesys-agent',
    'conversation-Id' : conversationId
  }
});

ws.on('open', () => {
  console.log('Connected to the server');
});

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    console.log('Received binary message:', data);
  } else {
    console.log('Received text message:', data.toString());
  }
});

ws.on('close', () => {
  console.log('Connection closed by server');
  ws.close();
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
  ws.close();
});
