const CACHE_NAME = 'flegma-tabulky-v14-unified-menu-20260712';
const APP_SHELL = [
  './',
  './index.html',
  './profile.html',
  './diary.html',
  './calendar.html',
  './training.html',
  './fit-import.html',
  './foods.html',
  './recipes.html',
  './recommendations.html',
  './settings.html',
  './graphs.html',
  './data.html',
  './ui.css',
  './pwa.js',
  './settings.js',
  './manifest.webmanifest',
  './icon.svg',
  './offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
      .catch(() => caches.match('./offline.html'))
  );
});
