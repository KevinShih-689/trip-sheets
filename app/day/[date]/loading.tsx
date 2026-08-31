import { QBlock } from '@/components/QBlock';

/**
 * 日頁面的路由 fallback(spec §4.1 的骨架版)。
 *
 * App Router 的切換包在 transition 裡:沒有這層 Suspense 邊界,router 會把舊頁面
 * 留在畫面上直到新 segment 就緒 —— 在行動網路上就是「點了沒反應」。
 *
 * 這裡不使用 Chakra,只用 globals.css 的既有 tokens:fallback 必須在日頁面的
 * chunk 抵達之前就能畫出來。QBlock 是純 CSS 元件,沒有額外相依。
 */
const SKELETON_CARDS = [
  { title: '72%', sub: '46%' },
  { title: '58%', sub: '62%' },
  { title: '81%', sub: '38%' },
  { title: '64%', sub: '54%' },
] as const;

export default function DayLoading(): React.JSX.Element {
  return (
    <div className="rl" aria-busy="true" aria-live="polite">
      <div className="rl-head">
        {/* 對齊真實 header:mono 28px 日期 + pixel 8px 的 WEEKDAY · DAY n */}
        <div className="sk sk-date" />
        <div className="sk sk-meta" />
        <div className="rl-tags only-mobile">
          <div className="sk sk-pill" style={{ width: 104 }} />
          <div className="sk sk-pill" style={{ width: 82 }} />
        </div>
      </div>
      <div className="rl-rule only-mobile" />

      <div>
        {SKELETON_CARDS.map((card) => (
          <div className="rl-card" key={card.title}>
            <div className="sk sk-time" />
            <div className="rl-card-main">
              <div className="sk sk-line" style={{ width: card.title }} />
              <div className="sk sk-line" style={{ width: card.sub, height: 9 }} />
            </div>
            <div className="sk sk-pill" style={{ width: 52 }} />
          </div>
        ))}
      </div>

      <div className="rl-foot">
        <QBlock size="sm" idle={false} />
        <span className="rl-label">LOADING DAY</span>
        <div className="rl-bar">
          <div className="rl-bar-fill" />
        </div>
      </div>
    </div>
  );
}
