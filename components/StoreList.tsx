'use client';

import { Box, Flex } from '@chakra-ui/react';
import { formatDistanceKm } from '@/lib/format';
import { STORE_TYPE_LABELS } from '@/lib/store-types';
import type { SuggestedStore } from '@/lib/suggestions';

/**
 * 推薦店家清單(spec §4.4)。點擊一列 = 選取該店:展開詳細資訊並定錨地圖,
 * 一次只選取一筆;再點一次同一列則取消選取,收合詳細並讓地圖回到基準錨。
 */
export function StoreList({
  stores,
  selectedIndex,
  onSelect,
}: {
  stores: readonly SuggestedStore[];
  /** 選取 = 定錨 + 展開;-1 = 未選取 */
  selectedIndex: number;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  return (
    <Box>
      {stores.map((store, i) => (
        <Box key={`${store.name}-${store.mapsUri}`}>
          {i > 0 && <Box borderTopWidth="1px" borderColor="pixel.line" mx="20px" />}
          <StoreRow
            store={store}
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

function StoreRow({
  store,
  selected,
  onToggle,
}: {
  store: SuggestedStore;
  selected: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <Box>
      <Flex
        as="button"
        w="100%"
        textAlign="left"
        gap="12px"
        px="20px"
        py="13px"
        minH="44px"
        cursor="pointer"
        align="center"
        aria-expanded={selected}
        onClick={onToggle}
      >
        <Box flex="1" minW={0}>
          <Box fontSize="14px" fontWeight="500" color={selected ? 'pixel.yellow' : undefined}>
            {store.name}
          </Box>
          <Box fontSize="11.5px" color="pixel.faint" mt="2px">
            {STORE_TYPE_LABELS[store.type]}
          </Box>
        </Box>
        <Box fontFamily="mono" fontSize="12px" color="pixel.faint" flexShrink={0}>
          {formatDistanceKm(store.distanceKm)}
        </Box>
      </Flex>

      <Box className={selected ? 'sdetail open' : 'sdetail'}>
        <Box className="sdetail-body">
          <Box
            bg="pixel.surface"
            borderWidth="1px"
            borderColor="pixel.line"
            borderRadius="10px"
            mx="16px"
            mb="13px"
            px="16px"
            py="14px"
          >
            {store.note !== '' && (
              <DetailRow label="備註">
                <Box as="span" color="pixel.dim">
                  {store.note}
                </Box>
              </DetailRow>
            )}
            <DetailRow label="地址">{store.address || '-'}</DetailRow>
            <DetailRow label="地圖">
              {store.mapsUri !== '' ? (
                <a href={store.mapsUri} target="_blank" rel="noreferrer">
                  在 Google Maps 開啟 ↗
                </a>
              ) : (
                '-'
              )}
            </DetailRow>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Flex gap="12px" fontSize="12.5px" py="4px">
      <Box color="pixel.faint" w="42px" flexShrink={0}>
        {label}
      </Box>
      <Box flex="1">{children}</Box>
    </Flex>
  );
}
