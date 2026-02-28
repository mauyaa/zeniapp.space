/* Minimal service worker for Zeni PWA. Pass-through; ready for future offline/cache strategies. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  /* Pass-through: no caching. Saved listings offline is handled by IndexedDB in the app. */
});
