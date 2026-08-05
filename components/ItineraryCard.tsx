'use client';

import { Box, Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { Tag, statusVariant } from './Tag';
import { formatYen } from '@/lib/format';
import type { ItineraryItem } from '@/lib/types';

/** 行程列:mobile 點擊展開;desktop(≥1024)詳細常駐展開(CSS .icard-detail 控制) */
export function ItineraryCard({ item }: { item: ItineraryItem }): React.JSX.Element {
  const [open, setOpen] = useState(false);
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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Box fontFamily="mono" fontSize="12px" lineHeight="1.5" fontWeight="500" color="mario.yellow" w="46px" flexShrink={0}>
          {item.timeSlot}
        </Box>
        <Box flex="1">
          <Box fontSize="14px" fontWeight="500">
            {item.name}
          </Box>
          <Box fontSize="11.5px" color="mario.faint" mt="2px">
            {[item.category, item.area].filter(Boolean).join(' · ')}
          </Box>
        </Box>
        {needsAttention ? (
          <Box alignSelf="center">
            <Tag variant="warn">{item.reservationStatus}</Tag>
          </Box>
        ) : item.estimatedCostJpy !== null ? (
          <Box fontFamily="mono" fontSize="12px" color="mario.faint" alignSelf="center">
            {formatYen(item.estimatedCostJpy)}
          </Box>
        ) : (
          <Box className="only-mobile" fontSize="16px" lineHeight="1" color="mario.faint" alignSelf="center">
            {open ? '−' : '+'}
          </Box>
        )}
      </Flex>

      <Box
        className={open ? 'icard-detail open' : 'icard-detail'}
        bg="mario.surface"
        borderWidth="1px"
        borderColor="mario.line"
        borderRadius="10px"
        mx="16px"
        mb="10px"
        mt="-4px"
        px="16px"
        py="14px"
      >
        <DetailRow label="交通">{item.transport || '-'}</DetailRow>
        <DetailRow label="營業">{item.openingHours || '-'}</DetailRow>
        <DetailRow label="費用">
          {item.estimatedCostJpy !== null ? (
            <Box as="span" fontFamily="mono" color="mario.yellow">
              {formatYen(item.estimatedCostJpy)}
            </Box>
          ) : (
            '-'
          )}
        </DetailRow>
        <DetailRow label="預約">
          {item.reservationStatus ? <Tag variant={statusVariant(item.reservationStatus)}>{item.reservationStatus}</Tag> : '-'}
        </DetailRow>
        {item.note && (
          <DetailRow label="備註">
            <Box as="span" color="mario.dim">
              {item.note}
            </Box>
          </DetailRow>
        )}
        <DetailRow label="地圖">
          <a
            href={item.link ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.area}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            Google Maps ↗
          </a>
        </DetailRow>
      </Box>
    </Box>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Flex gap="12px" fontSize="12.5px" py="4px">
      <Box color="mario.faint" w="58px" flexShrink={0}>
        {label}
      </Box>
      <Box flex="1">{children}</Box>
    </Flex>
  );
}
