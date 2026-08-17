'use client';

import { Box } from '@chakra-ui/react';
import { AnchoredMap } from './AnchoredMap';
import { EmptyState } from './EmptyState';
import { StoreList } from './StoreList';
import type { UseSuggestions } from './useSuggestions';
import { areaAnchor, deviceAnchor, storeAnchor, type MapAnchor } from '@/lib/map-anchor';

/**
 * 「推薦」Tab 內容(spec §4.2–4.4):上方定錨地圖 + 下方店家清單。
 * 搜尋期間只有清單顯示 skeleton,地圖維持在基準錨(避免閃爍)。
 */
export function SuggestionsPanel({
  suggestions,
  mainArea,
  hasAreaCenter,
}: {
  suggestions: UseSuggestions;
  mainArea: string;
  hasAreaCenter: boolean;
}): React.JSX.Element {
  const { results, loading, selectedIndex, select, deviceCenter } = suggestions;
  const selected = selectedIndex >= 0 ? (results[selectedIndex] ?? null) : null;

  // 定錨決策鏈(spec §4.3):選取的店家 → 裝置位置 → 當日區域 → 無錨
  let anchor: MapAnchor | null;
  let label: string;
  if (selected !== null) {
    anchor = storeAnchor(selected);
    label = selected.name;
  } else if (deviceCenter !== null) {
    anchor = deviceAnchor(deviceCenter);
    label = '目前位置';
  } else {
    anchor = areaAnchor(mainArea);
    label = mainArea;
  }

  return (
    <div className="sugg-root">
      <Box className="sugg-map panel-desktop">
        <AnchoredMap
          anchor={anchor}
          label={label}
          emptyText="[ 尚未設定活動區域,可開啟目前位置 ]"
        />
      </Box>
      <div className="sugg-list">
        {loading ? (
          <StoreListSkeleton />
        ) : results.length > 0 ? (
          <StoreList stores={results} selectedIndex={selectedIndex} onSelect={select} />
        ) : (
          <EmptyState
            title="此範圍內沒有符合的店家"
            hint={
              hasAreaCenter
                ? '換一個類型,或開啟目前位置模式再找找'
                : '這天還沒有設定活動區域,可開啟目前位置模式以裝置位置搜尋'
            }
          />
        )}
      </div>
    </div>
  );
}

/** 搜尋中的清單骨架(spec §4.2:每次搜尋都要有 loading 回饋) */
function StoreListSkeleton(): React.JSX.Element {
  return (
    <Box aria-hidden="true" data-testid="store-list-skeleton">
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i}>
          {i > 0 && <Box borderTopWidth="1px" borderColor="pixel.line" mx="20px" />}
          <Box px="20px" py="15px">
            <Box className="skel" w={`${70 - i * 6}%`} h="14px" />
            <Box className="skel" w="28%" h="10px" mt="8px" />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
