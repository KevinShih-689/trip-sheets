/**
 * 於 `next build` 之後，把 out/ 的實際產物寫進 out/sw.js 的 PRECACHE 與 VERSION。
 *
 * 為什麼要生成而不是手寫:precache 清單同時包含「行程日期」與「內容雜湊過的
 * chunk 檔名」,兩者都會隨每次 build 改變。手寫必然會過期,而過期的 addAll
 * 會讓 Service Worker 整個安裝失敗且沒有任何畫面提示。
 *
 * VERSION 由清單內容推導,所以只要產物有任何改變就會換版本,舊快取會在
 * activate 事件被清掉 —— 這是 navigate 改成 cache-first 之後的必要配套。
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const OUT_DIR = 'out';
const SW_FILE = 'sw.js';

const VERSION_MARKER = /^const VERSION = '[^']*'; \/\/ @generated$/m;
const PRECACHE_MARKER = /^const PRECACHE = \[[\s\S]*?\]; \/\/ @generated$/m;

// 只收 js 與 css。字型刻意不收:next/font 會為 Noto Sans TC 切出上百個 unicode
// 子集(這個專案是 125 個 woff2 / 約 6 MB),但瀏覽器只會依 unicode-range 下載
// 用得到的那幾個。全部 precache 會把安裝變成一次數 MB 的下載,正好是我們要避免
// 的事;改由 fetch 的 cache-first 分支在第一次用到時收進同一份快取即可。
const STATIC_ASSET = /^_next\/static\/.+\.(?:js|css)$/;

/** 把 out/ 的相對路徑清單，轉成 Service Worker 要 precache 的 scope 相對路徑。 */
export function toPrecacheEntries(relativePaths: readonly string[]): string[] {
  const entries = relativePaths.flatMap((path) => {
    // 404 與圖示不參與導覽:圖示由作業系統在安裝 PWA 時自行抓取,
    // 404 則永遠不該是使用者點得到的目標。
    if (path === '404.html' || path.startsWith('404/') || path.startsWith('icons/')) return [];
    if (path === 'manifest.json') return [path];
    // trailingSlash: true → 瀏覽器請求的是目錄路徑，cache key 必須跟著對齊
    if (path === 'index.html') return [''];
    if (path.endsWith('/index.html')) return [path.slice(0, -'index.html'.length)];
    // RSC payload:client-side navigation 真正等待的檔案(見 fetch-server-response.js)
    if (path === 'index.txt' || path.endsWith('/index.txt')) return [path];
    if (STATIC_ASSET.test(path)) return [path];
    return [];
  });
  return [...new Set(entries)].sort();
}

/** 由清單內容推導快取版本;chunk 檔名帶內容雜湊，所以任何產物變動都會換版本。 */
export function cacheVersion(entries: readonly string[]): string {
  const digest = createHash('sha256')
    .update([...entries].sort().join('\n'))
    .digest('hex');
  return `trip-${digest.slice(0, 12)}`;
}

/** 把版本與清單注入 sw.js 樣板。標記不存在時丟錯，避免產出一份空 precache 的 SW。 */
export function injectIntoSw(source: string, entries: readonly string[], version: string): string {
  if (!VERSION_MARKER.test(source)) {
    throw new Error(`gen-sw-precache: sw.js 缺少 VERSION 的 // @generated 標記`);
  }
  if (!PRECACHE_MARKER.test(source)) {
    throw new Error(`gen-sw-precache: sw.js 缺少 PRECACHE 的 // @generated 標記`);
  }
  const list = JSON.stringify(entries);
  return source
    .replace(VERSION_MARKER, `const VERSION = '${version}'; // @generated`)
    .replace(PRECACHE_MARKER, `const PRECACHE = ${list.replace(/,/g, ', ')}; // @generated`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function main(): void {
  const files = walk(OUT_DIR).map((f) => relative(OUT_DIR, f).split(sep).join('/'));
  const entries = toPrecacheEntries(files);
  if (entries.length === 0) {
    throw new Error(`gen-sw-precache: ${OUT_DIR}/ 沒有任何可 precache 的產物，build 可能失敗了`);
  }

  const version = cacheVersion(entries);
  const swPath = join(OUT_DIR, SW_FILE);
  writeFileSync(swPath, injectIntoSw(readFileSync(swPath, 'utf8'), entries, version));

  const docs = entries.filter((e) => e === '' || e.endsWith('/')).length;
  const payloads = entries.filter((e) => e.endsWith('.txt')).length;
  console.log(
    `gen-sw-precache: ${version} — ${entries.length} entries ` +
      `(${docs} documents, ${payloads} RSC payloads, ${entries.length - docs - payloads} assets)`,
  );
}

// 被測試 import 時不執行 IO
if (process.argv[1]?.endsWith('gen-sw-precache.ts')) main();
