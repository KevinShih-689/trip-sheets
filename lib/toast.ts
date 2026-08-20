/**
 * Toast 佇列的純粹規則:推入與汰換。計時器與渲染不在這裡。
 *
 * 上限存在的理由是視覺噪音,不是效能 —— 使用者連續切換條件時,舊訊息已經
 * 沒有參考價值,留著只會擠掉新的。所以滿了是汰換最舊的,而不是拒絕新的。
 */

export interface Toast {
  readonly id: number;
  readonly message: string;
}

/** 同時顯示的上限;超過時最舊的一則被擠掉 */
export const MAX_TOASTS = 3;

/**
 * 推入一則,必要時汰換最舊。刻意**不去重**:連按同一個切換時,兩則相同訊息
 * 各自出現才看得出「我真的按到了」——合併成一則會讓操作失去回饋。
 */
export function pushToast(list: readonly Toast[], toast: Toast): Toast[] {
  return [...list, toast].slice(-MAX_TOASTS);
}

/** 手動關閉:移除指定 id;找不到時原樣回傳(計時器與點擊可能同時到) */
export function dismissToast(list: readonly Toast[], id: number): Toast[] {
  return list.filter((t) => t.id !== id);
}
