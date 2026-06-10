// Service worker: offline tolerante (spec sección 13).
// Estrategia: network-first para navegación con fallback a cache,
// stale-while-revalidate para estáticos.

const CACHE_NAME = "juntada-v1";
const APP_SHELL = ["/", "/app", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
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
  // Nunca cachear datos de Supabase ni rutas de auth
  if (url.pathname.startsWith("/auth")) return;

  // Navegación: red primero, cache como fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match("/app"))
            .then((cached) => cached ?? Response.error())
        )
    );
    return;
  }

  // Estáticos: stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      })
    );
  }
});
