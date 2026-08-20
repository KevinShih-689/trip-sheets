import { Box, Flex } from '@chakra-ui/react';
import { AnchoredMap } from './AnchoredMap';
import { Tag } from './Tag';
import { formatYen } from '@/lib/format';
import type { MapAnchor } from '@/lib/map-anchor';
import type { TripDay } from '@/lib/types';

/**
 * Desktop 右側摘要欄(spec §4.6):DAY SUMMARY + TODO(待預約/候補中聚合)+ 定錨地圖。
 * 地圖比照推薦 Tab 放大並跟隨選取的行程定錨,兩個 Tab 的右欄結構因此一致。
 */
export function DayRail({
  day,
  subtotal,
  anchor,
  anchorLabel,
}: {
  day: TripDay;
  subtotal: number;
  anchor: MapAnchor | null;
  anchorLabel: string;
}): React.JSX.Element {
  const todos = day.items.filter(
    (i) => i.reservationStatus === '待預約' || i.reservationStatus === '候補中',
  );
  return (
    <aside className="day-rail only-desktop">
      <Box className="panel-desktop" w="full" p="16px">
        <Box fontFamily="pixel" fontSize="7px" color="pixel.faint">
          DAY SUMMARY
        </Box>
        <RailKv k="區域">{day.mainArea || '未定'}</RailKv>
        <RailKv k="住宿">{day.accommodation || '-'}</RailKv>
        <RailKv k="筆數">
          <Box as="span" fontFamily="mono" fontSize="12px">
            {day.items.length}
          </Box>
        </RailKv>
        <Box borderTopWidth="1px" borderColor="pixel.line" my="10px" />
        <RailKv k="預估花費">
          <Box as="span" fontFamily="mono" fontSize="15px" fontWeight="600" color="pixel.yellow">
            {formatYen(subtotal)}
          </Box>
        </RailKv>
      </Box>

      {(todos.length > 0 || day.highlight) && (
        <Box className="panel-desktop" w="full" p="16px">
          <Box fontFamily="pixel" fontSize="7px" color="pixel.redT">
            TODO
          </Box>
          {todos.map((t) => (
            <Flex
              key={t.name}
              fontSize="12.5px"
              mt="10px"
              justify="space-between"
              align="center"
              gap="10px"
            >
              <span>{t.name}</span>
              <Tag variant="warn">{t.reservationStatus}</Tag>
            </Flex>
          ))}
          {day.highlight && (
            <Box fontSize="11.5px" color="pixel.faint" mt="8px">
              重點:{day.highlight}
            </Box>
          )}
        </Box>
      )}

      <Box className="panel-desktop day-rail-map">
        <AnchoredMap anchor={anchor} label={anchorLabel} emptyText="[ 此日尚未設定活動區域 ]" />
      </Box>
    </aside>
  );
}

function RailKv({ k, children }: { k: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Flex justify="space-between" gap="12px" fontSize="12.5px" pt="10px">
      <Box color="pixel.faint" flexShrink={0}>
        {k}
      </Box>
      <Box textAlign="right">{children}</Box>
    </Flex>
  );
}
