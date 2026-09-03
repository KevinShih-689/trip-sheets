/* Service worker(spec §4.5):precache 全站,離線可瀏覽。
 *
 * VERSION 與 PRECACHE 由 scripts/gen-sw-precache.ts 在 `next build` 之後,
 * 依 out/ 的實際產物注入(見該檔開頭的說明)。原始碼裡不寫死任何行程日期或
 * chunk 檔名 —— 那兩者每次 build 都會變,寫死必定過期。
 *
 * 未經注入的這份原始檔會安裝成一個「不 precache、但仍可用」的 SW:
 * 所有資源改由第一次瀏覽時逐一收進快取,行為正確,只是第一次比較慢。
 */
const VERSION = 'trip-dev'; // @generated
const PRECACHE = []; // @generated

const SCOPE_PATH = new URL(self.registration.scope).pathname; // 含 basePath,如 /repo-name/
const PRECACHE_URLS = PRECACHE.map((p) => SCOPE_PATH + p);

/**
 * 逐筆 add 而不是 cache.addAll:addAll 是全有全無的,任何一筆暫時性的網路錯誤
 * 都會讓整個 SW 安裝失敗、且使用者端沒有任何提示。逐筆處理讓部分失敗仍能安裝,
 * 失敗清單則明確寫進 console 而不是吞掉。
 */
async function precache() {
  const cache = await caches.open(VERSION);
  const results = await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
  const failed = PRECACHE_URLS.filter((_, i) => results[i].status === 'rejected');
  if (failed.length > 0) {
    console.warn(`[sw] precache: ${failed.length}/${PRECACHE_URLS.length} 筆失敗`, failed);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** 寫回快取後回傳原始 response;非 2xx 不寫入,避免把錯誤頁固化下來。 */
function cacheAndReturn(key, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((cache) => cache.put(key, copy));
  }
  return res;
}

/**
 * RSC payload:client-side navigation 真正等待的檔案。Next 會在路由後面接上
 * index.txt,再加一個破快取用的 ?_rsc=<hash>(見 Next 的 setCacheBustingSearchParam)。
 */
function isRscPayload(url) {
  return url.pathname.endsWith('.txt');
}

/** /trip-sheets/day/2026-12-15/index.txt → /trip-sheets/day/2026-12-15/ */
function routeUrlFromPayload(url) {
  const route = new URL(url);
  route.search = '';
  route.pathname = route.pathname.endsWith('/index.txt')
    ? route.pathname.slice(0, -'index.txt'.length)
    : route.pathname.slice(0, -'.txt'.length) + '/';
  return route;
}

/**
 * 快取的 key。precache 收進來的是不帶 query 的 index.txt,但實際請求一定帶著
 * ?_rsc=<hash> —— 而 hash 會隨 router state 改變。若直接拿原請求去查,precache 的
 * payload 永遠命中不了,每次切頁還是得走網路;寫入時也會為同一份檔案堆出無數筆。
 * 所以 payload 一律以「去掉 query 的網址」當 key,其餘資源照原請求。
 */
function cacheKeyFor(req, url) {
  if (!isRscPayload(url)) return req;
  const key = new URL(url);
  key.search = '';
  return key.href;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 地圖 iframe 等外部資源不攔截

  // Next 抓不到 RSC payload 時(行動網路不穩,或 iOS Safari 的 pagehide 把 fetch
  // abort 掉)會退回一次瀏覽器導覽 —— 但它退回的網址是「已經接上 index.txt 的那一個」,
  // 不是原本的路由:fetch-server-response.js 的 catch 分支直接回傳 url.toString(),
  // 沒有經過 urlToUrlWithoutFlightMarker。GitHub Pages 以 text/plain 回這個檔,
  // 使用者看到的就是一整頁 payload 原始碼。這裡把這種導覽轉回真正的路由。
  if (req.mode === 'navigate' && isRscPayload(url)) {
    event.respondWith(Response.redirect(routeUrlFromPayload(url).href, 302));
    return;
  }

  // ignoreVary:payload 的請求帶有 RSC / Next-Router-* 標頭,而 precache 時是一般的
  // fetch。GitHub Pages 不回 Vary,但明確關掉比較不會踩到邊界情況。
  const key = cacheKeyFor(req, url);
  const lookup = caches.match(key, { ignoreVary: true });

  if (req.mode === 'navigate') {
    // 靜態站:內容只有重新部署才會變,所以先給快取、背景再更新(stale-while-revalidate)。
    // 換成新版是靠 activate 清掉舊 VERSION 的快取,下次啟動即為新內容。
    const revalidate = fetch(req).then((res) => cacheAndReturn(key, res));
    // waitUntil 必須在事件派送當下同步呼叫;放進 .then() 裡會落在事件生命週期之外。
    event.waitUntil(revalidate.catch(() => undefined));
    event.respondWith(
      lookup.then(
        (hit) =>
          hit ??
          // 沒有快取又連不上(例如離線時開一個沒 precache 到的路徑):退回 app shell
          revalidate.catch(() => caches.match(SCOPE_PATH, { ignoreVary: true })),
      ),
    );
    return;
  }

  // 其餘資源(_next/static 為內容雜湊命名、RSC payload 隨版本汰換):cache-first
  event.respondWith(lookup.then((hit) => hit ?? fetch(req).then((res) => cacheAndReturn(key, res))));
});
