'use client';

import { useEffect } from 'react';

/** SW 註冊後多久才開始跑(毫秒)。見下方註解說明為何要延後。 */
const REGISTER_DELAY_MS = 3000;

export function SwRegister(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

    // 刻意延後註冊。SW 安裝時會一次抓完整份 precache 清單,而 hydration 剛結束的
    // 那幾秒正是 <Link> 開始 prefetch、使用者也剛好看得到畫面可以點的時候 ——
    // 兩者搶同一條連線,在行動網路上會讓第一次切換頁面明顯變慢。
    // 這只影響「第一次造訪」的快取建立時機,不影響已安裝過的離線能力。
    const register = (): void => {
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
        .catch((err: unknown) => {
          console.warn('[sw] register failed:', err);
        });
    };

    let timer = 0;
    const schedule = (): void => {
      timer = window.setTimeout(register, REGISTER_DELAY_MS);
    };

    if (document.readyState === 'complete') {
      schedule();
      return () => window.clearTimeout(timer);
    }
    window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
