import { describe, expect, it } from 'vitest';
import { cacheVersion, injectIntoSw, toPrecacheEntries } from './gen-sw-precache';

describe('toPrecacheEntries', () => {
  it('把目錄式 HTML 轉成瀏覽器實際請求的目錄路徑', () => {
    expect(
      toPrecacheEntries(['index.html', 'backlog/index.html', 'day/2026-12-14/index.html']),
    ).toEqual(['', 'backlog/', 'day/2026-12-14/']);
  });

  it('保留 RSC payload(.txt),client-side navigation 靠它才不必走網路', () => {
    expect(toPrecacheEntries(['day/2026-12-14/index.txt', 'index.txt'])).toEqual([
      'day/2026-12-14/index.txt',
      'index.txt',
    ]);
  });

  it('收錄 _next/static 下的 js 與 css', () => {
    const files = [
      '_next/static/chunks/app/day/[date]/page-abc.js',
      '_next/static/css/main-def.css',
    ];
    expect(toPrecacheEntries(files)).toEqual([...files].sort());
  });

  it('排除字型:next/font 為中文字型切出上百個 unicode 子集,全抓會讓安裝變成數 MB 的下載', () => {
    expect(
      toPrecacheEntries(['_next/static/media/noto-123.woff2', '_next/static/media/plex-9.woff']),
    ).toEqual([]);
  });

  it('收錄 manifest.json', () => {
    expect(toPrecacheEntries(['manifest.json'])).toEqual(['manifest.json']);
  });

  it('排除 404、圖示與其他不參與導覽的產物', () => {
    expect(
      toPrecacheEntries([
        '404.html',
        '404/index.html',
        'icons/icon-192.png',
        'sw.js',
        'robots.txt',
      ]),
    ).toEqual([]);
  });

  it('輸出排序且去重,讓同一份產物永遠得到同一份清單', () => {
    const a = toPrecacheEntries(['backlog/index.html', 'index.html', 'backlog/index.html']);
    const b = toPrecacheEntries(['index.html', 'backlog/index.html']);
    expect(a).toEqual(b);
    expect(a).toEqual(['', 'backlog/']);
  });
});

describe('cacheVersion', () => {
  it('內容相同得到相同版本', () => {
    expect(cacheVersion(['a', 'b'])).toBe(cacheVersion(['a', 'b']));
  });

  it('產物改變(含 chunk hash 改名)就換版本,舊快取才會在 activate 被清掉', () => {
    expect(cacheVersion(['chunks/page-abc.js'])).not.toBe(cacheVersion(['chunks/page-def.js']));
  });

  it('版本字串可安全內嵌於單引號字面值', () => {
    expect(cacheVersion(['a'])).toMatch(/^trip-[0-9a-f]{12}$/);
  });
});

describe('injectIntoSw', () => {
  const template = [
    "const VERSION = 'trip-dev'; // @generated",
    'const PRECACHE = []; // @generated',
    'self.addEventListener("install", () => {});',
  ].join('\n');

  it('同時替換版本與清單', () => {
    const out = injectIntoSw(template, ['', 'backlog/'], 'trip-abc123456789');
    expect(out).toContain("const VERSION = 'trip-abc123456789'; // @generated");
    expect(out).toContain('const PRECACHE = ["", "backlog/"]; // @generated');
    expect(out).toContain('self.addEventListener("install", () => {});');
  });

  it('找不到標記時丟出錯誤,而不是靜默產出一份空 precache 的 SW', () => {
    expect(() => injectIntoSw('const VERSION = "x";', [], 'trip-a')).toThrow(/@generated/);
    expect(() => injectIntoSw("const VERSION = 'x'; // @generated", [], 'trip-a')).toThrow(
      /PRECACHE/,
    );
  });

  it('注入結果可重複執行(idempotent):再跑一次得到相同輸出', () => {
    const once = injectIntoSw(template, ['', 'backlog/'], 'trip-abc123456789');
    expect(injectIntoSw(once, ['', 'backlog/'], 'trip-abc123456789')).toBe(once);
  });
});
