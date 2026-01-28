// Self-unregistering service worker
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.registration.unregister();
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
});
