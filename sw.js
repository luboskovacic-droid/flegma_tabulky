const CACHE_NAME = 'flegma-tabulky-v50-split-diary-pages-20260715';
const APP_SHELL = [
  './',
  './index.html',
  './profile.html',
  './diary.html',
  './diary-log.html',
  './diary-hydration.html',
  './diary-fasting.html',
  './calendar.html',
  './checkin.html',
  './gym.html',
  './training.html',
  './fit-import.html',
  './foods.html',
  './recipes.html',
  './recommendations.html',
  './notes.html',
  './settings.html',
  './graphs.html',
  './data.html',
  './ui.css',
  './diary.css',
  './diary-core.js',
  './pwa.js',
  './settings.js',
  './personalization.js',
  './wellness.js',
  './food-seeds.js',
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('./checkin.html');
    })
  );
});
