const cacheName = "padelstar-v27";

const appShell = [
  "./",
  "./index.html",
  "./styles.css?v=padelstar-metadata-1",
  "./app.js?v=padelstar-metadata-1",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./assets/icons/padelstar-256.png",
  "./assets/icons/padelstar-512.png",
  "./assets/padelstar_logo-1200.png",
  "./assets/padelstar_button.png",
  "./assets/padelstar_button-900.png",
  "./assets/zigonia-it_logo_gold.png",
  "./assets/bg_img-2200.png",
  "./assets/New assets/menu_highlight.png",
  "./assets/fonts/TitilliumWeb-Bold.ttf",
  "./assets/fonts/Nunito-VariableFont_wght.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appShell)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => cache.put(event.request, responseToCache));
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    }),
  );
});
