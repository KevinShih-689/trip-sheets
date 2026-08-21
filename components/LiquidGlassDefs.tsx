/**
 * Liquid glass 的 SVG 折射濾鏡定義(spec §4.7)。
 *
 * 只有 Chromium 畫得出 `backdrop-filter: url(#…)`;Safari(含 iOS)與 Firefox
 * 會落到 globals.css 的 CSS 毛玻璃降級版,此 <svg> 對它們無作用但也無害。
 * WebKit 對這個語法「解析得過但不 render」,所以降級的判斷不能只看 @supports,
 * 實際閘門在 globals.css 的 `.lg`(webkit.org/b/245510)。
 * 整份文件只需要一份,由 DayView 掛載。
 */
export function LiquidGlassDefs(): React.JSX.Element {
  return (
    <svg className="lg-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="lg-refract" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.014"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2.4" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
