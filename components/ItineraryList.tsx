'use client';

import { Box } from '@chakra-ui/react';
import { ItineraryCard } from './ItineraryCard';
import type { ItineraryItem } from '@/lib/types';

/**
 * 行程清單:手風琴,一次只選取一筆(選取新的會收合前一筆)。
 * 選取狀態由 ItineraryPanel 持有 —— desktop 的右欄地圖要跟著同一個選取定錨。
 */
export function ItineraryList({
  items,
  selectedIndex,
  onSelect,
}: {
  items: ItineraryItem[];
  /** 選取 = 定錨 + 展開;-1 = 未選取 */
  selectedIndex: number;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  return (
    <Box className="day-timeline-list">
      {items.map((item, i) => (
        <Box key={`${item.timeSlot}-${item.name}`}>
          {i > 0 && <Box borderTopWidth="1px" borderColor="pixel.line" mx="20px" />}
          <ItineraryCard
            item={item}
            selected={selectedIndex === i}
            onToggle={() => {
              onSelect(i);
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
