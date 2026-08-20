'use client';

import { Box, Flex } from '@chakra-ui/react';
import { Tag, statusVariant } from './Tag';
import { formatYen } from '@/lib/format';
import type { ItineraryItem } from '@/lib/types';

interface ItineraryCardProps {
  item: ItineraryItem;
  /** 選取 = 展開詳細(desktop 另外定錨右欄地圖);由上層統一控管,確保一次只開一筆 */
  selected: boolean;
  onToggle: () => void;
}

/** 行程列:點擊展開詳細,desktop 同時定錨右欄地圖(spec §4.6) */
export function ItineraryCard({ item, selected, onToggle }: ItineraryCardProps): React.JSX.Element {
  const needsAttention = item.reservationStatus === '待預約' || item.reservationStatus === '候補中';

  return (
    <Box>
      <Flex
        as="button"
        w="100%"
        textAlign="left"
        gap="14px"
        px="20px"
        py="13px"
        minH="44px"
        cursor="pointer"
        onClick={onToggle}
        aria-expanded={selected}
      >
        <Box
          fontFamily="mono"
          fontSize="12px"
          lineHeight="1.5"
          fontWeight="500"
          color="pixel.yellow"
          w="46px"
          flexShrink={0}
        >
          {item.timeSlot}
        </Box>
        <Box flex="1">
          <Box fontSize="14px" fontWeight="500" color={selected ? 'pixel.yellow' : undefined}>
            {item.name}
          </Box>
          <Box fontSize="11.5px" color="pixel.faint" mt="2px">
            {[item.category, item.area].filter(Boolean).join(' · ')}
          </Box>
        </Box>
        {needsAttention ? (
          <Box alignSelf="center">
            <Tag variant="warn">{item.reservationStatus}</Tag>
          </Box>
        ) : item.estimatedCostJpy !== null ? (
          <Box fontFamily="mono" fontSize="12px" color="pixel.faint" alignSelf="center">
            {formatYen(item.estimatedCostJpy)}
          </Box>
        ) : (
          <Box
            className={selected ? 'icard-toggle open' : 'icard-toggle'}
            color="pixel.faint"
            alignSelf="center"
            aria-hidden="true"
          />
        )}
      </Flex>

      {/* 三層結構是展開動畫的必要條件:外層只負責 grid-template-rows 0fr→1fr 過場,
          中層 overflow: hidden 做裁切,內層才帶面板外觀(否則收合時 padding/border 會留殘影) */}
      <Box className={selected ? 'icard-detail open' : 'icard-detail'}>
        <Box className="icard-detail-body">
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
            <DetailRow label="交通">{item.transport || '-'}</DetailRow>
            <DetailRow label="營業">{item.openingHours || '-'}</DetailRow>
            <DetailRow label="費用">
              {item.estimatedCostJpy !== null ? (
                <Box as="span" fontFamily="mono" color="pixel.yellow">
                  {formatYen(item.estimatedCostJpy)}
                </Box>
              ) : (
                '-'
              )}
            </DetailRow>
            <DetailRow label="預約">
              {item.reservationStatus ? (
                <Tag variant={statusVariant(item.reservationStatus)}>{item.reservationStatus}</Tag>
              ) : (
                '-'
              )}
            </DetailRow>
            {item.note && (
              <DetailRow label="備註">
                <Box as="span" color="pixel.dim">
                  {item.note}
                </Box>
              </DetailRow>
            )}
            <DetailRow label="地圖">
              <a
                href={
                  item.link ??
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.area}`)}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Google Maps ↗
              </a>
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
      <Box color="pixel.faint" w="58px" flexShrink={0}>
        {label}
      </Box>
      <Box flex="1">{children}</Box>
    </Flex>
  );
}
