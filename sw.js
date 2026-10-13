const CACHE = "isidora-agenda-v6";
const APP = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Red primero (para recibir siempre la última versión), caché si no hay conexión.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});

// Botones "Hecho" / "Posponer" de la notificación.
self.addEventListener("notificationclick", (event) => {
  const accion = event.action || "abrir";
  const datos = event.notification.data || null;
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((w) => "focus" in w);
      if (abierta) {
        abierta.postMessage({ tipo: "accion-aviso", accion, datos });
        return abierta.focus();
      }
      let url = "./index.html";
      if (datos && accion !== "abrir") {
        url += "?acc=" + encodeURIComponent(accion) + "&o=" + encodeURIComponent(JSON.stringify(datos));
      }
      return clients.openWindow(url);
    })
  );
});
