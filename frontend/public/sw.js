// Prohori Offline Service Worker (Doc 02 Feature F34, S18)
// Caches /already-sent and /api/v1/safe-actions?context=after_payment for emergency offline access.

const CACHE_NAME = "prohori-offline-v1";
const OFFLINE_URLS = [
  "/already-sent",
  "/api/v1/safe-actions?context=after_payment",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        // Pre-cache failure is non-fatal in local dev
        console.warn("[SW] Pre-caching offline URLs failed:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercept /already-sent or safe-actions context=after_payment
  if (
    url.pathname === "/already-sent" ||
    (url.pathname.includes("/safe-actions") && url.search.includes("after_payment"))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (url.pathname === "/already-sent") {
              return caches.match("/");
            }
            return new Response(JSON.stringify([]), {
              headers: { "Content-Type": "application/json" },
            });
          });
        })
    );
  }
});

