const CACHE = 'dont-stop-v5';
const ASSETS = [
  './','./index.html','./game.html','./game.js','./save.js','./update.js','./build-info.js','./manifest.webmanifest','./icon.svg'
];

const isSameOrigin = request => new URL(request.url).origin === self.location.origin;
const shouldNetworkFirst = request => {
  const path = new URL(request.url).pathname;
  return request.mode === 'navigate' || /\/(index|game|save|update|build-info)\.js?$/.test(path) || /\.html?$/.test(path);
};

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('dont-stop-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;

  if (shouldNetworkFirst(request)) {
    event.respondWith(
      fetch(request, { cache:'no-store' })
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone())).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone())).catch(() => {});
        return response;
      });
    })
  );
});
