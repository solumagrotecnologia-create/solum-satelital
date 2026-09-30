// Service worker mínimo para el "instalable" (PWA) de Solum · Monitoreo Satelital.
// Objetivo único: permitir que el navegador ofrezca "Agregar a pantalla de inicio" / "Instalar app"
// y que abra en modo standalone (sin barra de navegador). NO cachea datos del cliente ni
// interfiere con los pedidos a Google Apps Script / Copernicus: cualquier request que no sea
// del propio sitio (mismo origin) se ignora por completo y va directo a la red.

const CACHE_NAME = 'solum-app-shell-v1';
// Ajustá esta lista si cambian los nombres de archivo reales en el repo.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // No fallamos la instalación si algún archivo del shell no existe con ese nombre exacto.
      return Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nunca tocar pedidos a otros dominios (Apps Script, Copernicus/Sentinel Hub, tiles de Esri, etc.)
  // ni pedidos que no sean GET. Se dejan pasar tal cual, sin pasar por el cache.
  if (url.origin !== self.location.origin || req.method !== 'GET') {
    return;
  }

  // Para el propio sitio: red primero (para que un cliente siempre vea la última versión
  // publicada), y si no hay conexión, se sirve la última copia guardada en caché.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
