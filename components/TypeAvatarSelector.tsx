'use client';

import { useEffect, useRef, useState } from 'react';
import { StoreTypeIcon } from './icons';
import { STORE_TYPES, STORE_TYPE_LABELS, type StoreTypeKey } from '@/lib/store-types';

/**
 * 類型選擇器(spec §4.5):平時只顯示目前類型的 Avatar,點擊後於上方展開選單。
 *
 * 選單固定列出全部五類、順序恆定 —— 若剔除目前類型,每選一次其餘選項就位移一格,
 * 使用者無法靠位置記憶操作。目前類型以高亮標示,點它只收合、不重新搜尋。
 */
export function TypeAvatarSelector({
  type,
  visible,
  onChange,
}: {
  type: StoreTypeKey;
  /**
   * 是否在「推薦」Tab。false 時仍留在 DOM 才有離場動畫可播,
   * 但以 aria-hidden + inert 退出無障礙樹與鍵盤焦點,等同不存在。
   */
  visible: boolean;
  onChange: (type: StoreTypeKey) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 離開推薦 Tab 時選單不該留著,否則下次回來會看到上次的展開狀態
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  // 點畫面其他地方即收合,避免選單擋住底下的清單
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={visible ? 'type-avatar-root' : 'type-avatar-root off'}
      ref={rootRef}
      aria-hidden={!visible}
      inert={!visible}
    >
      {open && (
        <div className="type-avatar-menu" role="menu">
          {STORE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="menuitem"
              className={t === type ? 'type-avatar lg on' : 'type-avatar lg'}
              title={STORE_TYPE_LABELS[t]}
              aria-label={STORE_TYPE_LABELS[t]}
              aria-current={t === type ? 'true' : undefined}
              onClick={() => {
                setOpen(false);
                if (t !== type) onChange(t);
              }}
            >
              <StoreTypeIcon type={t} />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="type-avatar lg on"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`店家類型:${STORE_TYPE_LABELS[type]}(點擊切換)`}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <StoreTypeIcon type={type} />
      </button>
    </div>
  );
}
