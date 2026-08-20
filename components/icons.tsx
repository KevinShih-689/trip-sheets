import type { StoreTypeKey } from '@/lib/store-types';

/**
 * 推薦頁用的內嵌 SVG 圖示(原創路徑,無第三方素材)。
 * 以 `currentColor` 描邊,顏色交給呼叫端的文字色決定。
 */

interface IconProps {
  size?: number;
}

function Svg({
  size = 18,
  children,
}: IconProps & { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** 餐廳:刀叉 */
function RestaurantIcon(props: IconProps): React.JSX.Element {
  return (
    <Svg {...props}>
      <path d="M6 3v7a2 2 0 0 0 4 0V3" />
      <path d="M8 10v11" />
      <path d="M17 3c-1.5 1.5-2 3.5-2 5.5S15.5 12 17 12h1V3z" />
      <path d="M17.5 12v9" />
    </Svg>
  );
}

/** 咖啡甜點:咖啡杯 */
function CafeIcon(props: IconProps): React.JSX.Element {
  return (
    <Svg {...props}>
      <path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
      <path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M7 3v2.5M11 3v2.5" />
    </Svg>
  );
}

/** 購物:提袋 */
function ShoppingIcon(props: IconProps): React.JSX.Element {
  return (
    <Svg {...props}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

/** 景點:相機 / 地標 */
function SightIcon(props: IconProps): React.JSX.Element {
  return (
    <Svg {...props}>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.4" />
    </Svg>
  );
}

/** 其他:星號 */
function OtherIcon(props: IconProps): React.JSX.Element {
  return (
    <Svg {...props}>
      <path d="M12 4l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6 9.7 9z" />
    </Svg>
  );
}

const BY_TYPE: Record<StoreTypeKey, (props: IconProps) => React.JSX.Element> = {
  restaurant: RestaurantIcon,
  cafe: CafeIcon,
  shopping: ShoppingIcon,
  sight: SightIcon,
  other: OtherIcon,
};

export function StoreTypeIcon({
  type,
  size,
}: {
  type: StoreTypeKey;
  size?: number;
}): React.JSX.Element {
  const Icon = BY_TYPE[type];
  return <Icon size={size} />;
}

/** 目前位置:準星 */
export function CrosshairIcon(props: IconProps): React.JSX.Element {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Svg>
  );
}
