// Network-only worker: no account data, signed photo URLs or API response caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
