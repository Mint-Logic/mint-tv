const CACHE_NAME = 'mint-tv-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only intercept standard GET requests to avoid unhandled promise rejections
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      return cachedResponse || Response.error();
    })
  );
});

/* ==========================================
   PUSH NOTIFICATION LISTENERS
   ========================================== */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'MintTV Update', body: event.data ? event.data.text() : 'New episode available!' };
  }

  const title = data.title || 'MintTV';
  const options = {
    body: data.body || 'A show on your watchlist has a new update!',
    // Show poster thumbnail (falls back to app icon)
    icon: data.icon || '/icon-192.png',
    // Expanded show poster image banner (Android / Desktop)
    image: data.image || null,
    // Custom status bar monochrome TV badge
    badge: '/badge-96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Focus existing open tab or open a new window when notification is tapped
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});