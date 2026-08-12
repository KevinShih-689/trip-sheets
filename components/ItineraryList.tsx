'use client';

import { Box } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ItineraryCard } from './ItineraryCard';
import type { ItineraryItem } from '@/lib/types';

/**
 * 行程清單:mobile 手風琴,一次只展開一筆(展開新的會收合前一筆)。
 * desktop(≥1024)詳細由 CSS 常駐展開,openIndex 不影響畫面。
 * 展開狀態放在這層而非各張卡片,是「一次只開一筆」的必要條件;
 * 順帶讓 matchMedia listener 從每張卡一個收斂成整份清單一個。
 */
export function ItineraryList({ items }: { items: ItineraryItem[] }): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent): void => {
      setIsDesktop(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <Box className="day-timeline-list">
      {items.map((item, i) => (
        <Box key={`${item.timeSlot}-${item.name}`}>
          {i > 0 && <Box borderTopWidth="1px" borderColor="pixel.line" mx="20px" />}
          <ItineraryCard
            item={item}
            open={openIndex === i}
            interactive={!isDesktop}
            onToggle={() => {
              setOpenIndex((current) => (current === i ? null : i));
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
