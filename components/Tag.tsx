import { Box } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export type TagVariant = 'neutral' | 'warn' | 'ok' | 'hot' | 'info';

const STYLES: Record<TagVariant, { bg: string; color: string }> = {
  neutral: { bg: 'rgba(235,240,255,0.08)', color: 'var(--dim)' },
  warn: { bg: 'rgba(229,37,33,0.20)', color: 'var(--red-t)' },
  ok: { bg: 'rgba(67,176,71,0.18)', color: 'var(--green-t)' },
  hot: { bg: 'rgba(251,208,0,0.14)', color: 'var(--yellow)' },
  info: { bg: 'rgba(4,156,216,0.18)', color: 'var(--blue-t)' },
};

/** 對應 Chakra Tag subtle variant 的定稿樣式(spec §4.4) */
export function Tag({ variant = 'neutral', children }: { variant?: TagVariant; children: ReactNode }): React.JSX.Element {
  const s = STYLES[variant];
  return (
    <Box
      as="span"
      fontSize="11px"
      fontWeight="500"
      lineHeight="1"
      px="8px"
      py="5px"
      borderRadius="4px"
      whiteSpace="nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </Box>
  );
}

/** 依預約/購買狀態決定 tag 變體 */
export function statusVariant(status: string | null): TagVariant {
  switch (status) {
    case '已預約':
    case '已購買':
    case '已付全額':
      return 'ok';
    case '待預約':
    case '候補中':
    case '比價中':
      return 'warn';
    case '當日抽':
      return 'info';
    default:
      return 'neutral';
  }
}
