const CACHE_NAME = 'juanelos-pwa-v7-performance';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './performance.js',
  './vendor/supabase/supabase.js?v=2.117.3',
  './order-services.js',
  './order-extras.js',
  './order-extras.css',
  './admin-extras.js',
  './admin-extras.css',
  './enlaces.html',
  './enlaces.css',
  './enlaces.js',
  './ubicacion.html',
  './ubicacion.css',
  './ubicacion.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './manifest.webmanifest',
  './admin.html',
  './admin.css',
  './admin.js',
  './admin.webmanifest',
  './sounds/order-notification.mp3',
  './images/optimized/juanelos-logo.webp',
  './images/juanelos-app-icon-192.png',
  './images/juanelos-app-icon-512.png',
  './images/optimized/juanelos-original.webp',
  './images/optimized/juanelos-poderosa.webp',
  './images/optimized/juanelos-payes.webp',
  './images/optimized/juanelos-parfait.webp',
  './images/optimized/juanelos-maracu-brownie.webp',
  './images/optimized/juanelos-choco-cruch.webp',
  './images/optimized/juanelos-fresas.webp',
  './images/optimized/juanelos-bebidas.webp'
].map(url => /\.(?:js|css)$/.test(url) && !url.startsWith('./vendor/') ? `${url}?v=20261010-2` : url);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const requestUrl = new URL(event.request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request, {ignoreSearch:true});
      const network = fetch(event.request).then(response => {
        if (response.ok) event.waitUntil(cache.put(new Request(requestUrl.origin+requestUrl.pathname),response.clone()));
        return response;
      });
      if (cached) { event.waitUntil(network.catch(() => {})); return cached; }
      return network;
    })());
    return;
  }
  const mustBeFresh = /\.(?:html|js|css)$/.test(requestUrl.pathname) || requestUrl.pathname.endsWith('/');
  if (mustBeFresh && !requestUrl.searchParams.has('v')) {
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
