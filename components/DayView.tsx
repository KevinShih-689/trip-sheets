'use client';

import { Box, Flex } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { DayTabSwitcher, type DayTab } from './DayTabSwitcher';
import { ItineraryPanel } from './ItineraryPanel';
import { LiquidGlassDefs } from './LiquidGlassDefs';
import { LocationToggle } from './LocationToggle';
import { SuggestionsPanel } from './SuggestionsPanel';
import { Tag } from './Tag';
import { Toasts } from './Toasts';
import { TypeAvatarSelector } from './TypeAvatarSelector';
import { GEO_FAILURE_NOTICE, useSuggestions } from './useSuggestions';
import { shortDate } from '@/lib/format';
import { STORE_TYPE_LABELS } from '@/lib/store-types';
import { useToasts } from './useToasts';
import type { LatLng, Store, TripDay } from '@/lib/types';

const WEEKDAY_EN: Record<string, string> = {
  日: 'SUN',
  一: 'MON',
  二: 'TUE',
  三: 'WED',
  四: 'THU',
  五: 'FRI',
  六: 'SAT',
};

const TAB_QUERY_VALUE = 'suggestions';

/**
 * 日頁面外殼:持有 Tab 與推薦搜尋狀態(spec §4.1)。
 *
 * 狀態集中在這一層,是因為控制項散落在三個不同的位置 —— Header 的目前位置
 * 按鈕、底部的切換鈕與 Avatar、內容區的清單與地圖 —— 它們共用同一組搜尋條件。
 */
export function DayView({
  day,
  dayIndex,
  stores,
  areaCenter,
}: {
  day: TripDay;
  dayIndex: number;
  stores: readonly Store[];
  areaCenter: LatLng | null;
}): React.JSX.Element {
  const [tab, setTab] = useState<DayTab>('itinerary');
  const suggestions = useSuggestions(stores, areaCenter);
  const { reset: resetSuggestions, lastSearch, type, searchMode, radiusKm } = suggestions;
  const toasts = useToasts();
  const { show: showToast } = toasts;

  // 靜態 export 的 HTML 不含 query,初始值只能在掛載後從 URL 補讀(避免 hydration 不一致)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === TAB_QUERY_VALUE) setTab('suggestions');
  }, []);

  // 搜尋條件變更後告知目前的類型與範圍。措辭在這一層組,因為只有這裡拿得到
  // 當日區域名;hook 只回報「被什麼觸發」。
  useEffect(() => {
    if (lastSearch.reason === 'enter') return; // 進入 Tab 不是使用者改的,不提示
    if (lastSearch.reason === 'geo-error') {
      showToast(GEO_FAILURE_NOTICE);
      return;
    }
    const where = searchMode ? '目前位置' : day.mainArea || '當日區域';
    showToast(`${STORE_TYPE_LABELS[type]} · ${where} ${radiusKm}km 內`);
    // token 是唯一的觸發依據:同樣的條件連按兩次也該出現兩則
  }, [lastSearch.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = useCallback(
    (next: DayTab): void => {
      // 每次進入推薦 Tab 都回到預設狀態(spec §4.1):推薦的搜尋狀態活在這一層,
      // 不像行程面板那樣切走就卸載,得自己清乾淨才不會帶著上次的條件回來
      if (next === 'suggestions' && tab !== 'suggestions') resetSuggestions();
      setTab(next);
      const url = new URL(window.location.href);
      if (next === 'suggestions') {
        url.searchParams.set('tab', TAB_QUERY_VALUE);
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', url);
    },
    [tab, resetSuggestions],
  );

  const onSuggestions = tab === 'suggestions';

  return (
    <Flex className="day-root" direction="column" minH="calc(100dvh - var(--tabbar-h))">
      <LiquidGlassDefs />

      <Box px={{ base: '20px', lg: '28px' }} pt="24px" pb="16px">
        <Flex align="flex-start" gap="12px">
          <Box flex="1" minW={0}>
            <Flex align="baseline" gap="12px">
              <Box fontFamily="mono" fontSize="28px" fontWeight="600">
                {shortDate(day.date)}
              </Box>
              <Box fontFamily="pixel" fontSize="8px" color="pixel.faint">
                {WEEKDAY_EN[day.weekdayZh] ?? ''} · DAY {dayIndex}
              </Box>
            </Flex>
            <Flex className="only-mobile" gap="8px" mt="12px" wrap="wrap">
              <Tag>區域 · {day.mainArea || '未定'}</Tag>
              {day.accommodation && <Tag>宿 · {day.accommodation}</Tag>}
            </Flex>
            {day.highlight && (
              <Box className="only-mobile" fontSize="12px" color="pixel.dim" mt="10px">
                重點:{day.highlight}
              </Box>
            )}
          </Box>
          {onSuggestions && (
            <LocationToggle
              active={suggestions.searchMode}
              onToggle={suggestions.toggleSearchMode}
            />
          )}
        </Flex>
      </Box>
      <Box className="only-mobile" borderTopWidth="1px" borderColor="pixel.line" />

      {onSuggestions ? (
        <SuggestionsPanel
          suggestions={suggestions}
          mainArea={day.mainArea}
          hasAreaCenter={areaCenter !== null}
        />
      ) : (
        <ItineraryPanel day={day} />
      )}

      {onSuggestions && <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />}

      <div className="day-controls">
        <DayTabSwitcher tab={tab} onChange={changeTab} />
        <TypeAvatarSelector
          type={suggestions.type}
          visible={onSuggestions}
          onChange={suggestions.setType}
        />
      </div>
    </Flex>
  );
}
