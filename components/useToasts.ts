'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { markExiting, pushToast, removeToast, type Toast } from '@/lib/toast';

/** 自動關閉時間(ms)。短到不擋路,長到讀得完一行條件敘述。 */
const TOAST_MS = 3000;

/** 退場動畫長度(ms),需與 globals.css 的 toast-out 一致 */
const EXIT_MS = 220;

export interface UseToasts {
  readonly toasts: readonly Toast[];
  readonly show: (message: string) => void;
  readonly dismiss: (id: number) => void;
}

/**
 * Toast 佇列 + 計時器。
 *
 * 退場一律兩段:先標記 `exiting`,再由下方的 effect 排定真正的移除。三條退場
 * 路徑(自動逾時、手動關閉、超過上限被擠掉)因此走同一段程式,動畫行為一致,
 * 也不必在 setState 的 updater 裡做副作用。
 */
export function useToasts(): UseToasts {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const removals = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const beginExit = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => markExiting(current, id));
  }, []);

  const show = useCallback(
    (message: string): void => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => pushToast(current, { id, message, exiting: false }).list);
      timers.current.set(
        id,
        setTimeout(() => {
          beginExit(id);
        }, TOAST_MS),
      );
      // 被上限擠掉的那則已由 pushToast 標記為 exiting,移除交給下方 effect
    },
    [beginExit],
  );

  // 任何進入退場的 toast,動畫播完就真正移除
  useEffect(() => {
    toasts.forEach((toast) => {
      if (!toast.exiting || removals.current.has(toast.id)) return;
      removals.current.set(
        toast.id,
        setTimeout(() => {
          removals.current.delete(toast.id);
          setToasts((current) => removeToast(current, toast.id));
        }, EXIT_MS),
      );
    });
  }, [toasts]);

  useEffect(() => {
    const pending = timers.current;
    const pendingRemovals = removals.current;
    return () => {
      [pending, pendingRemovals].forEach((map) => {
        map.forEach((timer) => {
          clearTimeout(timer);
        });
        map.clear();
      });
    };
  }, []);

  return { toasts, show, dismiss: beginExit };
}
