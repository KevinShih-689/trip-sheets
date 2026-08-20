'use client';

export type DayTab = 'itinerary' | 'suggestions';

const TABS: { key: DayTab; label: string }[] = [
  { key: 'itinerary', label: '行程' },
  { key: 'suggestions', label: '推薦' },
];

/** 「行程 / 推薦」切換鈕(spec §4.1);外觀為 liquid glass 藥丸 */
export function DayTabSwitcher({
  tab,
  onChange,
}: {
  tab: DayTab;
  onChange: (tab: DayTab) => void;
}): React.JSX.Element {
  return (
    <div className="day-switch lg" role="tablist" aria-label="日檢視切換">
      {/* 選取態畫在這顆滑塊上而非按鈕背景,切換才有位移動畫可看;
          它純粹是裝飾,語意由按鈕的 aria-selected 承擔 */}
      <span
        className={tab === 'suggestions' ? 'day-switch-thumb end' : 'day-switch-thumb'}
        aria-hidden="true"
      />
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={tab === t.key}
          className={tab === t.key ? 'day-switch-btn on' : 'day-switch-btn'}
          onClick={() => {
            onChange(t.key);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
