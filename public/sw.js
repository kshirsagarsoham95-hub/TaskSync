const CACHE = 'tasksync-v6';
const STATIC = ['/', '/css/main.css', '/css/theme.css', '/css/kanban.css',
  '/css/gantt.css', '/css/analytics.css', '/js/app.js'];

self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys =>
  Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
