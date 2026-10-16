/*
 * Service worker de Siju (app del cliente).
 *  - Estáticos de Next (/_next/static): caché primero (llevan hash, no cambian).
 *  - Páginas de /app y sus datos RSC: red primero; sin red, la última copia guardada.
 *  - Nada de /coach ni peticiones POST (las acciones) pasan por la caché.
 */
const VERSION = "siju-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.pathname === "/app" || url.pathname.startsWith("/app/")) {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    // Navegación sin copia: al menos la pantalla "Hoy" si se visitó antes.
    if (req.mode === "navigate") {
      const today = await cache.match("/app", { ignoreVary: true });
      if (today) return today;
    }
    throw err;
  }
}
