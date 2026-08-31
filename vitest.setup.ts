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

/**
 * jsdom 也沒有實作 scrollIntoView;AppNav 會用它把當日 tab 捲進可視範圍。
 * 補一個 no-op 讓組件測試跑得動,行為本身由瀏覽器負責、不在單元測試範圍。
 */
if (typeof window !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = (): void => undefined;
}
