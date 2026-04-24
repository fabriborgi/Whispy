// Whispy Service Worker — caches the app shell and CDN assets for offline use.
// After the first load, the app works even with a weak or absent signal.
// The PeerJS signaling still needs a brief internet connection (~3 KB per tourist).
// Audio is always P2P on the local Wi-Fi — zero mobile data.

const CACHE = 'whispy-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

const CDN_HOSTS = [
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: cache the app shell immediately ──────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't block install if some assets fail
  );
});

// ── Activate: purge old caches ────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and WebSocket/PeerJS signaling — always network
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/peerjs')) return;
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Navigation requests → serve cached index.html (SPA shell)
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html')
        .then(r => r || fetch(request))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // App shell + CDN assets → cache-first, network fallback
  const isCacheable =
    url.origin === self.location.origin ||
    CDN_HOSTS.some(h => url.hostname.endsWith(h));

  if (isCacheable) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
  }
});
