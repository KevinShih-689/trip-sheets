'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dismissToast, pushToast, type Toast } from '@/lib/toast';

/** 自動關閉時間(ms)。短到不擋路,長到讀得完一行條件敘述。 */
const TOAST_MS = 3000;

export interface UseToasts {
  readonly toasts: readonly Toast[];
  readonly show: (message: string) => void;
  readonly dismiss: (id: number) => void;
}

/**
 * Toast 佇列 + 每則各自的自動關閉計時器。
 *
 * 計時器以 id 為 key 存在 ref 裡,因為每則的倒數是獨立的 —— 手動關閉第二則
 * 不該影響第一則的剩餘時間。unmount 時全部清掉,避免對已卸載的元件 setState。
 */
export function useToasts(): UseToasts {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const clearTimer = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: number): void => {
      clearTimer(id);
      setToasts((current) => dismissToast(current, id));
    },
    [clearTimer],
  );

  const show = useCallback(
    (message: string): void => {
      nextId.current += 1;
      const id = nextId.current;
      // 被上限擠掉的那則,它的計時器也要一起收掉
      setToasts((current) => {
        const next = pushToast(current, { id, message });
        current.forEach((t) => {
          if (!next.some((n) => n.id === t.id)) clearTimer(t.id);
        });
        return next;
      });
      timers.current.set(
        id,
        setTimeout(() => {
          dismiss(id);
        }, TOAST_MS),
      );
    },
    [clearTimer, dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => {
        clearTimeout(timer);
      });
      pending.clear();
    };
  }, []);

  return { toasts, show, dismiss };
}
