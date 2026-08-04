'use client';

import { useEffect } from 'react';

export function SwRegister(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    navigator.serviceWorker
      .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
      .catch((err: unknown) => {
        console.warn('[sw] register failed:', err);
      });
  }, []);
  return null;
}
