/**
 * Toast 佇列的純粹規則。計時器與渲染不在這裡。
 *
 * 移除是兩段式的:先標記 `exiting` 讓退場動畫播完,呼叫端再真正移除。單段式
 * 移除會讓節點瞬間從 DOM 消失,CSS 沒有東西可以動畫。
 *
 * 上限只計算「未退場」的那些 —— 對使用者的承諾是「最多同時 3 則」,正在淡出的
 * 不該佔用名額,否則新訊息會被還在消失的舊訊息擋住。
 */

export interface Toast {
  readonly id: number;
  readonly message: string;
  /** 退場動畫進行中:仍在 DOM,但不計入上限 */
  readonly exiting: boolean;
}

/** 同時顯示的上限;超過時最舊的一則開始退場 */
export const MAX_TOASTS = 3;

export interface PushResult {
  readonly list: Toast[];
  /** 因超過上限而被要求退場的那一則;呼叫端負責排定它的真正移除 */
  readonly evicted: number | null;
}

/**
 * 推入一則,必要時讓最舊的開始退場。刻意**不去重**:連按同一個切換時,兩則
 * 相同訊息各自出現才看得出「我真的按到了」——合併成一則會讓操作失去回饋。
 */
export function pushToast(list: readonly Toast[], toast: Toast): PushResult {
  const next = [...list, toast];
  const live = next.filter((t) => !t.exiting);
  if (live.length <= MAX_TOASTS) return { list: next, evicted: null };

  const oldest = live[0];
  if (!oldest) return { list: next, evicted: null };
  return { list: markExiting(next, oldest.id), evicted: oldest.id };
}

/** 開始退場:仍留在 DOM 供動畫播放,但已不計入上限 */
export function markExiting(list: readonly Toast[], id: number): Toast[] {
  return list.map((t) => (t.id === id ? { ...t, exiting: true } : t));
}

/** 動畫結束後真正移除;找不到時原樣回傳(計時器與點擊可能同時到) */
export function removeToast(list: readonly Toast[], id: number): Toast[] {
  return list.filter((t) => t.id !== id);
}
