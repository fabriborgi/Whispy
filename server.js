// Whispy — local signaling + static server
//
// Designed for guides who have a laptop or Raspberry Pi on the hotspot.
// Tourists connect to the guide's Wi-Fi, open http://<local-ip>:9000 —
// everything (app + signaling) is served locally. Zero internet needed.
//
// Usage:
//   npm install
//   npm start
//
// The server prints the local IP address to share with tourists.
// Set WHISPY_PORT env var to change the port (default: 9000).
//
// For cloud deploy on Render/Fly.io, this server also works — in that case
// tourists use the internet for signaling but audio is still P2P on LAN.

import express from 'express';
import { ExpressPeerServer } from 'peer';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

const PORT = parseInt(process.env.WHISPY_PORT || process.env.PORT || '9000', 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// ── PeerJS signaling (/peerjs) ─────────────────────────────────────────
const peerServer = ExpressPeerServer(server, { path: '/' });
app.use('/peerjs', peerServer);

peerServer.on('connection', c => console.log(`  ✓ peer connected:    ${c.getId()}`));
peerServer.on('disconnect', c => console.log(`  ✗ peer disconnected: ${c.getId()}`));

// ── Static files ───────────────────────────────────────────────────────
app.use(express.static(__dirname, {
  // Service Worker requires this header to control the root scope
  setHeaders(res, filePath) {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
    }
    // Always re-check for updates; CDN caching in sw.js handles the heavy lifting
    res.setHeader('Cache-Control', 'no-cache');
  },
}));

// SPA fallback — ?join=<peerId> links must still serve index.html
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Start ──────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const nets = networkInterfaces();
  const localIPs = Object.values(nets)
    .flat()
    .filter(a => a.family === 'IPv4' && !a.internal)
    .map(a => a.address);

  console.log('\n🎙  Whispy local server ready\n');
  if (localIPs.length) {
    localIPs.forEach(ip => console.log(`  → http://${ip}:${PORT}   ← share this with tourists`));
  }
  console.log(`  → http://localhost:${PORT}   (this device only)`);
  console.log('\n  Tourists: join your Wi-Fi → open the URL above → done.\n');
});
