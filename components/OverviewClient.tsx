'use client';

import { Box, Flex } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Tag } from './Tag';
import { TRIP_DATES, TRIP_EYEBROW, TRIP_TITLE } from '@/lib/constants';
import { dayCostSum, formatGeneratedAt, formatYen } from '@/lib/format';
import type { TripDay } from '@/lib/types';

const WEEKDAY_EN: Record<string, string> = {
  日: 'SUN', 一: 'MON', 二: 'TUE', 三: 'WED', 四: 'THU', 五: 'FRI', 六: 'SAT',
};

function todayIso(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mapSrc(area: string): string {
  const query = encodeURIComponent(`${area} 日本`);
  const key = process.env.NEXT_PUBLIC_GMAPS_EMBED_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${query}&zoom=13&language=zh-TW`;
  }
  // 無 key 時的 keyless fallback(本機開發用)
  return `https://maps.google.com/maps?q=${query}&z=13&hl=zh-TW&output=embed`;
}

interface Props {
  days: readonly TripDay[];
  generatedAt: string;
}

export function OverviewClient({ days, generatedAt }: Props): React.JSX.Element {
  const first = TRIP_DATES[0] ?? '2026-12-14';
  const [focusDate, setFocusDate] = useState<string>(first);
  const [isToday, setIsToday] = useState<boolean>(false);
  const [online, setOnline] = useState<boolean>(true);

  // 依裝置日期自動 focus 當天(spec §4.2);SSR 先渲染第一天避免 hydration mismatch
  useEffect(() => {
    const t = todayIso();
    if (TRIP_DATES.includes(t)) {
      setFocusDate(t);
      setIsToday(true);
    }
    setOnline(navigator.onLine);
    const on = (): void => setOnline(true);
    const off = (): void => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const focusDay = useMemo(() => days.find((d) => d.date === focusDate), [days, focusDate]);
  const totalCost = useMemo(
    () => days.reduce((sum, d) => sum + dayCostSum(d.items.map((i) => i.estimatedCostJpy)), 0),
    [days],
  );
  const showMap = online && (focusDay?.mainArea ?? '') !== '';

  return (
    <Box>
      <Box px="20px" pt="24px" pb="14px">
        <Box fontFamily="pixel" fontSize="8px" letterSpacing="0.06em" color="mario.faint">
          {TRIP_EYEBROW}
        </Box>
        <Box fontSize="24px" fontWeight="700" letterSpacing="0.02em" mt="10px">
          {TRIP_TITLE}
        </Box>
      </Box>

      {/* 地圖:定位 focus 日的主要活動區域;離線/無區域時顯示條紋 placeholder */}
      <Box position="relative" mx="16px" mb="14px" h="148px" borderRadius="12px" borderWidth="1px" borderColor="mario.line" overflow="hidden">
        {showMap && focusDay ? (
          <iframe
            title={`地圖:${focusDay.mainArea}`}
            src={mapSrc(focusDay.mainArea)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: 0, width: '100%', height: '100%', filter: 'saturate(0.85)' }}
          />
        ) : (
          <Flex className="map-stripes" direction="column" align="center" justify="center" gap="8px" h="100%">
            <span className="map-pin" />
            <Box fontFamily="mono" fontSize="10px" letterSpacing="0.06em" color="mario.faint">
              {online ? '[ 此日尚未設定活動區域 ]' : '[ 離線中,地圖無法載入 ]'}
            </Box>
          </Flex>
        )}
        <Box position="absolute" right="10px" top="10px">
          <Tag variant="hot">
            {isToday && focusDate === todayIso() ? 'TODAY · ' : 'FOCUS · '}
            {focusDate.slice(5).replace('-', '/')}
          </Tag>
        </Box>
      </Box>

      <Box borderTopWidth="1px" borderColor="mario.line">
        {days.map((day, idx) => {
          const focused = day.date === focusDate;
          const cost = dayCostSum(day.items.map((i) => i.estimatedCostJpy));
          const dayNum = String(Number(day.date.slice(8)));
          return (
            <Box key={day.date}>
              {idx > 0 && <Box borderTopWidth="1px" borderColor="mario.line" mx="20px" />}
              <Flex
                as="button"
                w="100%"
                textAlign="left"
                align="center"
                gap="14px"
                px="20px"
                py="12px"
                minH="44px"
                cursor="pointer"
                bg={focused ? 'rgba(251,208,0,0.07)' : 'transparent'}
                onClick={() => setFocusDate(day.date)}
              >
                <Box w="42px" flexShrink={0}>
                  <Box fontFamily="mono" fontSize="24px" lineHeight="1" fontWeight="500" color={focused ? 'mario.yellow' : 'mario.dim'}>
                    {dayNum}
                  </Box>
                  <Box fontFamily="pixel" fontSize="7px" mt="4px" color={focused ? 'mario.yellow' : 'mario.faint'} opacity={focused ? 0.8 : 1}>
                    {WEEKDAY_EN[day.weekdayZh] ?? ''}
                  </Box>
                </Box>
                <Box flex="1">
                  <Box fontSize="14px" fontWeight="500">
                    {day.mainArea || '(未定)'}
                  </Box>
                  <Box fontSize="11.5px" color="mario.faint" mt="3px">
                    {day.accommodation ? `宿:${day.accommodation}` : `${day.items.length} 筆行程`}
                  </Box>
                </Box>
                <Box fontFamily="mono" fontSize="13px" fontWeight="500" color={focused ? 'mario.yellow' : 'mario.dim'}>
                  {formatYen(cost)}
                </Box>
              </Flex>
            </Box>
          );
        })}
      </Box>

      <Flex borderTopWidth="1px" borderColor="mario.line" px="20px" py="12px" justify="space-between" align="baseline">
        <Box fontSize="11px" color="mario.faint">
          資料更新於 {formatGeneratedAt(generatedAt)}
        </Box>
        <Box fontFamily="mono" fontSize="13px" fontWeight="500" color="mario.yellow">
          Σ {formatYen(totalCost)}
        </Box>
      </Flex>
    </Box>
  );
}
