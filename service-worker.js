const cacheName = "padelstar-v53";

const appShell = [
  "./",
  "./index.html",
  "./privacy.html",
  "./styles.css?v=padelstar-home-1",
  "./translations.js?v=padelstar-i18n-3",
  "./tournament-engine.js?v=padelstar-engine-1",
  "./scoring-engine.js?v=padelstar-scoring-1",
  "./state-manager.js?v=padelstar-state-1",
  "./realtime-sync.js?v=padelstar-realtime-sync-1",
  "./offline-storage.js?v=padelstar-offline-1",
  "./app.js?v=padelstar-session-3",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./assets/icons/padelstar-256.png",
  "./assets/icons/padelstar-512.png",
  "./assets/padelstar_logo-720.png",
  "./assets/padelstar_button-540.png",
  "./assets/zigonia-it_logo_gold-512.png",
  "./assets/bg_img-1600.png",
  "./assets/New assets/menu_highlight.png",
  "./assets/fonts/TitilliumWeb-Bold.ttf",
  "./assets/fonts/Nunito-VariableFont_wght.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appShell)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (!response || !response.ok) return response;
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => cache.put(event.request, responseToCache));
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === "navigate") {
          return caches.match("./index.html").then((indexResponse) => indexResponse || caches.match("./"));
        }
        return Response.error();
      });
    }),
  );
});
