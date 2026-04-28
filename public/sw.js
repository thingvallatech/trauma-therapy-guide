// Self-unregistering service worker. The previous deploy registered a SW that
// is now obsolete; this stub unregisters itself so any browser still holding
// the old SW drops it on next visit. Safe to delete this file once enough
// time has passed that no stale registrations remain in the wild.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const clientsList = await self.clients.matchAll({ type: 'window' });
      await self.registration.unregister();
      clientsList.forEach((c) => c.navigate(c.url));
    })()
  );
});
