/**
 * 測試環境補強。jsdom 沒有實作 matchMedia,組件(如 Splash 判斷
 * prefers-reduced-motion)會用到;node 環境的純函式測試會跳過整段。
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
