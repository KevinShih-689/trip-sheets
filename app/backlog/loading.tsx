import { QBlock } from '@/components/QBlock';

/**
 * 行前資訊的路由 fallback。標題是固定文案,直接畫真的 ——
 * 使用者第一眼就知道自己到了哪一頁,只有資料區是骨架。
 * 與 day 的 fallback 同樣不經 Chakra,理由見 app/day/[date]/loading.tsx。
 */
const SECTIONS = [
  { zh: '機票', en: 'BOARDING' },
  { zh: '環球影城', en: 'USJ' },
] as const;

export default function BacklogLoading(): React.JSX.Element {
  return (
    <div className="rl" aria-busy="true" aria-live="polite">
      <div className="rl-head">
        <div className="rl-eyebrow">PRE-TRIP</div>
        <div className="rl-title">行前資訊</div>
      </div>

      <div className="rl-cols">
        {SECTIONS.map((section) => (
          <section key={section.en}>
            <div className="rl-head" style={{ paddingTop: 20, paddingBottom: 8 }}>
              <div className="sk sk-line" style={{ width: 96, height: 13 }} />
            </div>
            <div className="rl-card">
              <div className="rl-card-main">
                <div className="sk sk-line" style={{ width: '64%' }} />
                <div className="sk sk-line" style={{ width: '42%', height: 9 }} />
                <div className="sk sk-line" style={{ width: '78%', height: 9 }} />
              </div>
              <div className="sk sk-pill" style={{ width: 56 }} />
            </div>
          </section>
        ))}
      </div>

      <div className="rl-foot">
        <QBlock size="sm" idle={false} />
        <span className="rl-label">LOADING PRE-TRIP</span>
        <div className="rl-bar">
          <div className="rl-bar-fill" />
        </div>
      </div>
    </div>
  );
}
