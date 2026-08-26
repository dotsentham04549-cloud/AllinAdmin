/* ALL IN · офлайн-кэш v8 */
const CACHE = 'allin-v8';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function isShell(req) {
  const u = new URL(req.url);
  return req.mode === 'navigate'
    || u.pathname.endsWith('/')
    || u.pathname.endsWith('.html')
    || u.pathname.endsWith('.json')
    || u.pathname.endsWith('.js');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Каркас приложения: сначала сеть, кэш — только если сети нет.
  if (isShell(e.request)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Картинки и шрифты: сначала кэш, они не меняются.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
