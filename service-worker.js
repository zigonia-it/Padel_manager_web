const cacheName = "padel-manager-v6";

const appShell = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/padel-manager-logo.png",
  "./assets/icons/appicon-256.png",
  "./assets/icons/appicon-512.png",
  "./assets/fonts/Orbitron-VariableFont_wght.ttf",
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

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    }),
  );
});
