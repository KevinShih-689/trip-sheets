'use client';

import { CloseIcon } from './icons';
import type { Toast } from '@/lib/toast';

/**
 * 搜尋條件變更的提示堆疊。desktop 靠右下、mobile 底部置中(定位見 globals.css)。
 *
 * 整個堆疊是單一 aria-live 區域:三則各自宣讀會蓋掉彼此,由容器統一播報才聽得完整。
 */
export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: number) => void;
}): React.JSX.Element | null {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="toast-text">{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label={`關閉提示:${toast.message}`}
            onClick={() => {
              onDismiss(toast.id);
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
