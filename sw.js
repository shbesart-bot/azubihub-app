/* AzubiHub Service Worker: App-Start offline aus dem Zwischenspeicher, Push-Benachrichtigungen. */
const CACHE = 'azubihub-v33';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon-32.png', './demo.js', './i18n.js', './schule.js', './ausbildung.js', './vendor/supabase.js', './vendor/figtree-latin-400-normal.woff2', './vendor/figtree-latin-600-normal.woff2', './vendor/figtree-latin-700-normal.woff2', './vendor/bricolage-grotesque-latin-700-normal.woff2', './vendor/jspdf.umd.min.js', './vendor/notosans-400Regular.ttf', './vendor/notosans-700Bold.ttf'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Seiten: erst Netz (immer aktuell), bei Funkloch aus dem Speicher. Daten von Supabase nie zwischenspeichern.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'AzubiHub', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'AzubiHub', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag, renotify: !!d.tag, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope);
  const view = target.hash.slice(1);
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (new URL(c.url).origin === target.origin) { c.focus(); if (view) c.postMessage({ go: view }); return; } }
    return self.clients.openWindow(target.href);
  }));
});
