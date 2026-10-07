const CACHE_NAME = 'mint-tv-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Respond directly from network
  event.respondWith(fetch(event.request));
});