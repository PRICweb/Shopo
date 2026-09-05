/* Shopo PWA + Firebase Cloud Messaging */
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBwjx4CSqjgDj9GN4apNQoXbfNtrMjSZjk',
  authDomain: 'shopo-bed8a.firebaseapp.com',
  projectId: 'shopo-bed8a',
  storageBucket: 'shopo-bed8a.firebasestorage.app',
  messagingSenderId: '254059510929',
  appId: '1:254059510929:web:a9dd69f5353c6fb06f1330'
});

const messaging = firebase.messaging();
const CACHE_VERSION = 'shopo-pwa-v5';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_SCOPE = '/Shopo/';
const PRECACHE = [
  '/Shopo/',
  '/Shopo/offline.html',
  '/Shopo/manifest.webmanifest',
  '/Shopo/icons/icon-72.png',
  '/Shopo/icons/icon-96.png',
  '/Shopo/icons/icon-128.png',
  '/Shopo/icons/icon-144.png',
  '/Shopo/icons/icon-152.png',
  '/Shopo/icons/icon-192.png',
  '/Shopo/icons/icon-384.png',
  '/Shopo/icons/icon-512.png',
  '/Shopo/icons/icon-maskable-192.png',
  '/Shopo/icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('shopo-pwa-') && k !== STATIC_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.startsWith(APP_SCOPE)) {
    event.respondWith((async () => {
      try {
        return await fetch(request, { cache: 'no-store' });
      } catch (_) {
        return (await caches.match('/Shopo/offline.html')) || Response.error();
      }
    })());
    return;
  }

  // El manifest debe priorizar red para que Android reciba inmediatamente
  // cambios de theme_color/background_color de la PWA instalada.
  if (url.origin === self.location.origin && url.pathname === '/Shopo/manifest.webmanifest') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith(APP_SCOPE) && /\.(?:css|js|png|jpg|jpeg|webp|svg|webmanifest)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const network = fetch(request).then(async response => {
        if (response && response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
  }
});

messaging.onBackgroundMessage(payload => {
  const data = payload?.data || {};
  const title = data.title || 'Shopo';
  const options = {
    body: data.body || '',
    icon: '/Shopo/icons/icon-192.png',
    badge: '/Shopo/icons/icon-96.png',
    vibrate: [180, 90, 180],
    tag: data.tipo ? `shopo-${data.tipo}` : undefined,
    renotify: true,
    data: {
      target: data.target || 'panel-movimientos',
      abrirAcordeon: data.abrirAcordeon || ''
    }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.target || 'panel-movimientos';
  const acordeon = data.abrirAcordeon || '';
  const url = new URL('/Shopo/', self.location.origin);
  url.searchParams.set('pwaPanel', target);
  if (acordeon) url.searchParams.set('pwaAcordeon', acordeon);

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(url.href);
        return client.focus();
      }
    }
    return clients.openWindow(url.href);
  })());
});
