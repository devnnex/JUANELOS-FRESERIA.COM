const CACHE_NAME = 'juanelos-pwa-v4';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './admin.html',
  './admin.css',
  './admin.js',
  './admin.webmanifest',
  './sounds/order-notification.mp3',
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
  const requestUrl = new URL(event.request.url);
  const mustBeFresh = /\.(?:html|js|css)$/.test(requestUrl.pathname) || requestUrl.pathname.endsWith('/');
  if (mustBeFresh) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});

self.addEventListener('notificationclick', event => {
  const orderId = event.notification.data?.orderId || '';
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
    const adminClient = windowClients.find(client => client.url.includes('/admin'));
    if (adminClient) {
      adminClient.postMessage({ type: 'OPEN_ORDER', orderId });
      return adminClient.focus();
    }
    const target = `./admin.html${orderId ? `?order=${encodeURIComponent(orderId)}` : ''}`;
    return clients.openWindow(target);
  }));
});
