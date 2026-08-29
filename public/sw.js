const CACHE_VERSION = "ibemhal-v5.5.4-live-now-launch";
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

function offlineResponse(message = "Offline") {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ibemhal IAS - Offline</title></head><body><main style="font-family:system-ui;padding:32px;max-width:680px;margin:auto"><h1>Ibemhal IAS</h1><p>${message}</p><p>Please reconnect to the internet and reload this page.</p></main></body></html>`,
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

async function cachedOfflineOrResponse(message) {
  const cached = await caches.match("/offline");
  return cached || offlineResponse(message);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
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
            .filter((key) => !key.startsWith(CACHE_VERSION))
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

  // Every API/auth request is network-only and never cached.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(
        () =>
          new Response(
            JSON.stringify({
              success: false,
              error: "Offline — this request requires a network connection",
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
    if (isPrivatePath(url.pathname)) {
      event.respondWith(
        fetch(request, { cache: "no-store" }).catch(() =>
          cachedOfflineOrResponse("This secure page requires a network connection.")
        )
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || cachedOfflineOrResponse("The website is temporarily offline.");
        })
    );
    return;
  }

  // Public static assets: stale-while-revalidate. A failed network request
  // always resolves to a real Response; respondWith must never receive
  // undefined (the cause of the previous Chrome TypeError).
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || network;
    })
  );
});