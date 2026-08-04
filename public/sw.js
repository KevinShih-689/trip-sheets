/* Minimal service worker(spec §4.5):precache 全頁面,離線可瀏覽 */
const VERSION = 'trip-v1';
const SCOPE_PATH = new URL(self.registration.scope).pathname; // 含 basePath,如 /repo-name/

const PRECACHE = [
  '',
  'backlog/',
  'day/2026-12-14/',
  'day/2026-12-15/',
  'day/2026-12-16/',
  'day/2026-12-17/',
  'day/2026-12-18/',
  'day/2026-12-19/',
  'manifest.json',
].map((p) => SCOPE_PATH + p);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 地圖 iframe 等外部資源不攔截

  if (req.mode === 'navigate') {
    // 頁面:network-first,離線 fallback cache → 首頁
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match(SCOPE_PATH))),
    );
    return;
  }

  // 靜態資源(_next/static 為 content-hash,cache-first 安全)
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
