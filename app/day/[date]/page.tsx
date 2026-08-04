import { Box, Flex } from '@chakra-ui/react';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { ItineraryCard } from '@/components/ItineraryCard';
import { Tag } from '@/components/Tag';
import { TRIP_DATES } from '@/lib/constants';
import { dayCostSum, formatYen, shortDate } from '@/lib/format';
import { getTripData } from '@/lib/trip-data';

const WEEKDAY_EN: Record<string, string> = {
  日: 'SUN', 一: 'MON', 二: 'TUE', 三: 'WED', 四: 'THU', 五: 'FRI', 六: 'SAT',
};

export function generateStaticParams(): { date: string }[] {
  return TRIP_DATES.map((date) => ({ date }));
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }): Promise<React.JSX.Element> {
  const { date } = await params;
  const data = getTripData();
  const day = data.days.find((d) => d.date === date);
  if (!day) notFound();

  const dayIndex = TRIP_DATES.indexOf(date) + 1;
  const subtotal = dayCostSum(day.items.map((i) => i.estimatedCostJpy));

  return (
    <Flex direction="column" minH="calc(100dvh - var(--tabbar-h))">
      <Box px="20px" pt="24px" pb="16px">
        <Flex align="baseline" gap="12px">
          <Box fontFamily="mono" fontSize="28px" fontWeight="600">
            {shortDate(day.date)}
          </Box>
          <Box fontFamily="pixel" fontSize="8px" color="mario.faint">
            {WEEKDAY_EN[day.weekdayZh] ?? ''} · DAY {dayIndex}
          </Box>
        </Flex>
        <Flex gap="8px" mt="12px" wrap="wrap">
          <Tag>區域 · {day.mainArea || '未定'}</Tag>
          {day.accommodation && <Tag>宿 · {day.accommodation}</Tag>}
        </Flex>
        {day.highlight && (
          <Box fontSize="12px" color="mario.dim" mt="10px">
            重點:{day.highlight}
          </Box>
        )}
      </Box>
      <Box borderTopWidth="1px" borderColor="mario.line" />

      {day.items.length === 0 ? (
        <EmptyState
          title="這天還沒有行程"
          hint={`到 Google Sheets 的「${shortDate(day.date)} (${day.weekdayZh})」tab 新增第一筆行程後重新部署`}
        />
      ) : (
        <>
          <Box flex="1">
            {day.items.map((item, i) => (
              <Box key={`${item.timeSlot}-${item.name}`}>
                {i > 0 && <Box borderTopWidth="1px" borderColor="mario.line" mx="20px" />}
                <ItineraryCard item={item} />
              </Box>
            ))}
          </Box>
          <Flex borderTopWidth="1px" borderColor="mario.line" px="20px" py="13px" justify="space-between" align="baseline">
            <Box fontSize="12px" color="mario.dim">
              當日預估花費
            </Box>
            <Box fontFamily="mono" fontSize="16px" fontWeight="600" color="mario.yellow">
              {formatYen(subtotal)}
            </Box>
          </Flex>
        </>
      )}
    </Flex>
  );
}
