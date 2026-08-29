const CACHE_VERSION = "ibemhal-v5.5.3-launch-auth-hotfix2";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const PRIVATE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/student",
  "/profile",
  "/mock-test",
  "/login",
  "/learn",
  "/live-classes",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        cache
          .addAll(PRECACHE_URLS)
          .catch(() => undefined)
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                !key.startsWith(CACHE_VERSION)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API/auth calls must always go to the network and must never be cached.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(
        () =>
          new Response(
            JSON.stringify({
              success: false,
              error:
                "Offline — this request requires a network connection",
            }),
            {
              status: 503,
              headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
              },
            }
          )
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    // Protected/student/admin pages are network-only. Never reuse a cached
    // page from another account or an earlier role.
    if (isPrivatePath(url.pathname)) {
      event.respondWith(
        fetch(request, { cache: "no-store" }).catch(
          () => caches.match("/offline")
        )
      );
      return;
    }

    // Public navigation remains network-first with a safe runtime fallback.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches
              .open(RUNTIME)
              .then((cache) =>
                cache.put(request, copy)
              );
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached || caches.match("/offline")
            )
        )
    );
    return;
  }

  // Public static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches
              .open(RUNTIME)
              .then((cache) =>
                cache.put(request, copy)
              );
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
