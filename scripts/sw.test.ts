/**
 * public/sw.js 的行為測試。
 *
 * 為什麼放在 scripts/ 而不是 public/:public/ 底下的東西會被原樣複製進 out/,
 * 測試檔擺在那裡會跟著部署出去。SW 相關的測試因此都收在這裡,與
 * gen-sw-precache.test.ts 相鄰。
 *
 * 測的是「注入後」的 sw.js —— 也就是真正部署出去的那一份。做法是用 node:vm 把它
 * 放進一個假的 ServiceWorkerGlobalScope 執行,再對它註冊的 listener 派送合成事件。
 * Response 與 URL 直接用 Node 的原生實作,只有 self / caches / fetch 是假的。
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { cacheVersion, injectIntoSw, toPrecacheEntries } from './gen-sw-precache';

const ORIGIN = 'https://example.github.io';
const SCOPE = `${ORIGIN}/trip-sheets/`;

/** 模擬一次 build 的 out/ 內容:兩天行程 + 首頁 + 行前,外加該被排除的 404 與圖示。 */
const OUT_FILES = [
  '404.html',
  '_next/static/chunks/611-abc.js',
  '_next/static/css/main-def.css',
  '_next/static/media/noto-subset.p.woff2',
  'backlog/index.html',
  'backlog/index.txt',
  'day/2026-12-14/index.html',
  'day/2026-12-14/index.txt',
  'day/2026-12-15/index.html',
  'day/2026-12-15/index.txt',
  'icons/icon-192.png',
  'index.html',
  'index.txt',
  'manifest.json',
] as const;

interface RequestLike {
  readonly url: string;
  readonly method: string;
  readonly mode: string;
}

type CacheKey = RequestLike | string;

/** Cache API 會把相對網址對 SW 的 base URL 解析,mock 必須跟著做,否則 SCOPE_PATH 對不上。 */
function urlOf(key: CacheKey): string {
  return new URL(typeof key === 'string' ? key : key.url, SCOPE).href;
}

/** 測試裡對 fetch 的替身:預設每個網址都回 200,個別測試可覆寫。 */
type FetchImpl = (url: string) => Promise<Response>;

class FakeCache {
  readonly entries = new Map<string, Response>();

  /** cache.add 在規格上就是 fetch 後寫入、非 2xx 要 reject,所以要拿得到 fetch 替身。 */
  constructor(private readonly fetcher: FetchImpl) {}

  async add(url: string): Promise<void> {
    const res = await this.fetcher(urlOf(url));
    if (!res.ok) throw new Error(`add failed: ${url}`);
    this.entries.set(urlOf(url), res);
  }

  async put(key: CacheKey, res: Response): Promise<void> {
    this.entries.set(urlOf(key), res);
  }

  async match(key: CacheKey): Promise<Response | undefined> {
    return this.entries.get(urlOf(key));
  }
}

interface Sw {
  readonly dispatch: (type: string, event: object) => Promise<void>;
  readonly caches: Map<string, FakeCache>;
  readonly fetched: string[];
  readonly version: string;
  readonly precache: readonly string[];
  setFetch: (impl: FetchImpl) => void;
}

function loadSw(): Sw {
  const precache = toPrecacheEntries([...OUT_FILES]);
  const version = cacheVersion(precache);
  const source = injectIntoSw(readFileSync('public/sw.js', 'utf8'), precache, version);

  const listeners = new Map<string, (event: object) => void>();
  const store = new Map<string, FakeCache>();
  const fetched: string[] = [];
  let fetchImpl: FetchImpl = async (url) => new Response(`net:${url}`, { status: 200 });

  /** 每次外送請求都記一筆,測試才能斷言「這次有沒有碰網路」。 */
  const traceFetch: FetchImpl = async (url) => {
    fetched.push(url);
    return fetchImpl(url);
  };

  const cacheStorage = {
    open: async (name: string): Promise<FakeCache> => {
      const existing = store.get(name);
      if (existing) return existing;
      const created = new FakeCache(traceFetch);
      store.set(name, created);
      return created;
    },
    keys: async (): Promise<string[]> => [...store.keys()],
    delete: async (name: string): Promise<boolean> => store.delete(name),
    match: async (key: CacheKey): Promise<Response | undefined> => {
      for (const cache of store.values()) {
        const hit = await cache.match(key);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const context = createContext({
    self: {
      registration: { scope: SCOPE },
      location: { origin: ORIGIN },
      addEventListener: (type: string, fn: (event: object) => void): void => {
        listeners.set(type, fn);
      },
      skipWaiting: async (): Promise<void> => undefined,
      clients: { claim: async (): Promise<void> => undefined },
    },
    caches: cacheStorage,
    fetch: async (key: CacheKey): Promise<Response> => traceFetch(urlOf(key)),
    Response,
    URL,
    console,
  });
  runInContext(source, context);

  return {
    dispatch: async (type, event): Promise<void> => {
      const listener = listeners.get(type);
      if (!listener) throw new Error(`sw.js 沒有註冊 ${type} listener`);
      listener(event);
    },
    caches: store,
    fetched,
    version,
    precache,
    setFetch: (impl) => {
      fetchImpl = impl;
    },
  };
}

interface FetchEventResult {
  readonly response: Response | undefined;
  readonly waited: readonly Promise<unknown>[];
}

/** 派送一個 fetch 事件,回傳 respondWith 收到的結果(沒呼叫則為 undefined)。 */
async function sendFetch(
  sw: Sw,
  request: { url: string; method?: string; mode?: string },
): Promise<FetchEventResult> {
  let responded: Promise<Response> | Response | undefined;
  const waited: Promise<unknown>[] = [];
  await sw.dispatch('fetch', {
    request: { url: request.url, method: request.method ?? 'GET', mode: request.mode ?? 'cors' },
    respondWith: (value: Promise<Response> | Response): void => {
      responded = value;
    },
    waitUntil: (value: Promise<unknown>): void => {
      waited.push(value);
    },
  });
  return { response: responded === undefined ? undefined : await responded, waited };
}

async function installAndActivate(sw: Sw): Promise<void> {
  const pending: Promise<unknown>[] = [];
  await sw.dispatch('install', { waitUntil: (p: Promise<unknown>) => pending.push(p) });
  await sw.dispatch('activate', { waitUntil: (p: Promise<unknown>) => pending.push(p) });
  await Promise.all(pending);
  sw.fetched.length = 0; // install 造成的請求不算進之後的斷言
}

describe('install / activate', () => {
  it('precache 逐筆收進以 VERSION 命名的快取,網址帶上 scope 前綴', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    const cache = sw.caches.get(sw.version);
    expect(cache).toBeDefined();
    expect(cache?.entries.size).toBe(sw.precache.length);
    expect([...(cache?.entries.keys() ?? [])]).toContain(`${SCOPE}day/2026-12-15/index.txt`);
  });

  it('單筆失敗不會讓整個 install 失敗,其餘照樣收進快取', async () => {
    const sw = loadSw();
    sw.setFetch(async (url) =>
      url.endsWith('manifest.json')
        ? new Response('nope', { status: 500 })
        : new Response(`net:${url}`, { status: 200 }),
    );
    await installAndActivate(sw);

    const cache = sw.caches.get(sw.version);
    expect(cache?.entries.size).toBe(sw.precache.length - 1);
    expect(cache?.entries.has(`${SCOPE}manifest.json`)).toBe(false);
  });

  it('activate 清掉非當前 VERSION 的舊快取', async () => {
    const sw = loadSw();
    sw.caches.set('trip-old', new FakeCache(async () => new Response('stale', { status: 200 })));
    await installAndActivate(sw);

    expect([...sw.caches.keys()]).toEqual([sw.version]);
  });
});

describe('RSC payload 導覽的攔截(本次修正的主題)', () => {
  // Next 抓不到 payload 時會退回一次瀏覽器導覽,但退回的網址是加過 index.txt 的那一個。
  // 沒有這道攔截,GitHub Pages 會以 text/plain 把 payload 原始碼整頁畫出來。
  it.each([
    ['day/2026-12-15/index.txt', 'day/2026-12-15/'],
    ['day/2026-12-15/index.txt?_rsc=1a2b3c', 'day/2026-12-15/'],
    ['index.txt', ''],
    ['backlog.txt', 'backlog/'],
  ])('%s 的頂層導覽被 302 導回 %s', async (from, to) => {
    const sw = loadSw();
    await installAndActivate(sw);

    const { response } = await sendFetch(sw, { url: `${SCOPE}${from}`, mode: 'navigate' });

    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe(`${SCOPE}${to}`);
  });

  it('同一個 .txt 若不是頂層導覽,就不轉址,照常走快取', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    const { response } = await sendFetch(sw, { url: `${SCOPE}day/2026-12-15/index.txt` });

    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe(`net:${SCOPE}day/2026-12-15/index.txt`);
  });
});

describe('payload 的快取 key 去掉 ?_rsc', () => {
  // Next 每次請求 payload 都會附一個隨 router state 改變的破快取參數。若拿原請求當
  // key,precache 進來的 payload 永遠命中不了,每次切頁都得走網路 —— 那正是導覽失敗、
  // 進而退回壞網址的起點。
  it('帶 ?_rsc 的請求命中不帶參數的 precache,完全不碰網路', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    const { response } = await sendFetch(sw, {
      url: `${SCOPE}day/2026-12-15/index.txt?_rsc=deadbeef`,
    });

    expect(await response?.text()).toBe(`net:${SCOPE}day/2026-12-15/index.txt`);
    expect(sw.fetched).toEqual([]);
  });

  it('走網路取回的 payload 以去掉參數的網址寫回,換一個 _rsc 也能命中', async () => {
    const sw = loadSw();
    await installAndActivate(sw);
    sw.caches.get(sw.version)?.entries.clear();

    await sendFetch(sw, { url: `${SCOPE}day/2026-12-14/index.txt?_rsc=aaa` });
    const second = await sendFetch(sw, { url: `${SCOPE}day/2026-12-14/index.txt?_rsc=bbb` });

    expect(sw.fetched).toEqual([`${SCOPE}day/2026-12-14/index.txt?_rsc=aaa`]);
    expect(await second.response?.text()).toBe(`net:${SCOPE}day/2026-12-14/index.txt?_rsc=aaa`);
  });

  it('一般資源不做這個正規化,帶參數與不帶參數是兩筆', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    await sendFetch(sw, { url: `${SCOPE}_next/static/chunks/611-abc.js?v=2` });

    expect(sw.fetched).toEqual([`${SCOPE}_next/static/chunks/611-abc.js?v=2`]);
  });
});

describe('一般導覽', () => {
  it('cache-first:先回快取,同時在背景重新抓一次', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    const { response, waited } = await sendFetch(sw, {
      url: `${SCOPE}day/2026-12-15/`,
      mode: 'navigate',
    });

    expect(await response?.text()).toBe(`net:${SCOPE}day/2026-12-15/`);
    expect(sw.fetched).toEqual([`${SCOPE}day/2026-12-15/`]); // 背景更新確實有發出
    expect(waited).toHaveLength(1);
  });

  it('沒快取又連不上時退回 app shell', async () => {
    const sw = loadSw();
    await installAndActivate(sw);
    sw.setFetch(async () => {
      throw new Error('offline');
    });

    const { response } = await sendFetch(sw, {
      url: `${SCOPE}day/2099-01-01/`,
      mode: 'navigate',
    });

    expect(await response?.text()).toBe(`net:${SCOPE}`);
  });
});

describe('不攔截的請求', () => {
  it('非 GET 一律放行', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    const { response } = await sendFetch(sw, { url: `${SCOPE}anything`, method: 'POST' });

    expect(response).toBeUndefined();
  });

  it('跨網域資源(地圖 iframe 等)一律放行', async () => {
    const sw = loadSw();
    await installAndActivate(sw);

    const { response } = await sendFetch(sw, { url: 'https://maps.google.com/maps?q=tokyo' });

    expect(response).toBeUndefined();
  });
});
