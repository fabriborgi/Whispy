// Whispy signaling server — wraps PeerJS's official peer-server npm package.
// Deploy free on Render (render.com) or Fly.io — no paid tier needed.
//
// After deploy, set window.WHISPY_PEER_HOST in index.html to your server URL
// OR add a <script> tag before the app:
//   <script>window.WHISPY_PEER_HOST = 'https://your-app.onrender.com';</script>

import { PeerServer } from 'peer';

const PORT = parseInt(process.env.PORT || '9000', 10);

const server = PeerServer({
  port: PORT,
  path: '/',
  // Allow everyone — tourists and guides connect dynamically.
  // PeerJS cloud has no IP auth either; this matches that model.
  allow_discovery: false,
  corsOptions: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

server.on('connection', (client) => {
  console.log(`[whispy] peer connected: ${client.getId()}`);
});

server.on('disconnect', (client) => {
  console.log(`[whispy] peer disconnected: ${client.getId()}`);
});

console.log(`[whispy] signaling server listening on :${PORT}`);
