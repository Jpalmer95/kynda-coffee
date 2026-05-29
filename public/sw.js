// Kynda Coffee PWA Service Worker v3
// Caches app shell, pages, images, and menu data for offline access

const CACHE_NAME = "kynda-v3";
const DATA_CACHE = "kynda-data-v1";
const IMAGE_CACHE = "kynda-images-v1";

const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/menu",
  "/shop",
  "/blog",
  "/rewards",
  "/contact",
];

// Install — cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key !== CACHE_NAME &&
              key !== IMAGE_CACHE &&
              key !== DATA_CACHE
          )
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — strategy routing
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API mutations, auth, admin, and external requests
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/admin/") ||
    url.pathname.startsWith("/staff/") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Menu data endpoint: stale-while-revalidate (fast + fresh)
  if (url.pathname === "/api/products" || url.pathname === "/api/menu") {
    event.respondWith(staleWhileRevalidate(event.request, DATA_CACHE));
    return;
  }

  // Images: cache first, network fallback + cache
  if (event.request.destination === "image") {
    event.respondWith(cacheFirstWithNetworkFallback(event.request, IMAGE_CACHE));
    return;
  }

  // Pages/assets: network first, cache fallback, offline page for navigation
  event.respondWith(
    networkFirstWithOfflineFallback(event.request, CACHE_NAME)
  );
});

// --- Strategy helpers ---

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response("", { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    // Navigation requests → offline page
    if (request.mode === "navigate") {
      const offlinePage = await cache.match("/offline");
      if (offlinePage) return offlinePage;
    }

    return new Response("Offline — Kynda Coffee", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Background sync for cart actions when offline
self.addEventListener("sync", (event) => {
  if (event.tag === "kynda-cart-sync") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "CART_SYNC_READY" })
        );
      })
    );
  }
});

// Push notification handling
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Kynda Coffee", {
      body: data.body ?? "You have a new update!",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag ?? "kynda-default",
      requireInteraction: false,
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});

// Listen for skip-waiting message from the install prompt or update flow
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
