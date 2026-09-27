const CACHE_NAME = 'juanelos-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './images/juanelos-logo.png',
  './images/juanelos-app-icon-192.png',
  './images/juanelos-app-icon-512.png',
  './images/juanelos-original.png',
  './images/juanelos-poderosa.png',
  './images/juanelos-payes.png',
  './images/juanelos-parfait.png',
  './images/juanelos-maracu-brownie.png',
  './images/juanelos-choco-cruch.png',
  './images/juanelos-fresas.png',
  './images/juanelos-bebidas.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});
