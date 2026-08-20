'use client';

import { Box, Flex } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { DayRail } from './DayRail';
import { EmptyState } from './EmptyState';
import { ItineraryList } from './ItineraryList';
import { dayCostSum, formatYen, shortDate } from '@/lib/format';
import { areaAnchor, itineraryAnchor, type MapAnchor } from '@/lib/map-anchor';
import type { TripDay } from '@/lib/types';

/**
 * 「行程」Tab 內容:左清單 + 右摘要欄(spec §4.6)。
 *
 * 選取狀態放在這一層,是因為清單與右欄地圖共用它 —— 點擊行程列 = 展開詳細
 * 並定錨地圖,再點一次取消選取並回到基準錨,與推薦 Tab 同一套互動邏輯。
 * Mobile 沒有地圖,同一個狀態只驅動手風琴展開。
 */
export function ItineraryPanel({ day }: { day: TripDay }): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const subtotal = dayCostSum(day.items.map((i) => i.estimatedCostJpy));

  const select = useCallback((index: number): void => {
    setSelectedIndex((current) => (current === index ? -1 : index));
  }, []);

  if (day.items.length === 0) {
    return (
      <EmptyState
        title="這天還沒有行程"
        hint={`到 Google Sheets 的「${shortDate(day.date)} (${day.weekdayZh})」tab 新增第一筆行程後重新部署`}
      />
    );
  }

  // 定錨決策鏈(spec §4.3):選取的行程 → 當日區域 → 無錨。
  // 行程 Tab 沒有目前位置模式,基準錨恆為當日區域。
  const selected = selectedIndex >= 0 ? (day.items[selectedIndex] ?? null) : null;
  const anchor: MapAnchor | null =
    selected !== null ? itineraryAnchor(selected, day.mainArea) : areaAnchor(day.mainArea);
  const label = selected !== null ? selected.name : day.mainArea;

  return (
    <div className="day-grid">
      <Box className="panel-desktop day-timeline" flex="1">
        <ItineraryList items={day.items} selectedIndex={selectedIndex} onSelect={select} />
        <Flex
          className="day-timeline-foot"
          borderTopWidth="1px"
          borderColor="pixel.line"
          px="20px"
          py="13px"
          justify="space-between"
          align="baseline"
        >
          <Box fontSize="12px" color="pixel.dim">
            當日預估花費
          </Box>
          <Box fontFamily="mono" fontSize="16px" fontWeight="600" color="pixel.yellow">
            {formatYen(subtotal)}
          </Box>
        </Flex>
      </Box>
      <DayRail day={day} subtotal={subtotal} anchor={anchor} anchorLabel={label} />
    </div>
  );
}
