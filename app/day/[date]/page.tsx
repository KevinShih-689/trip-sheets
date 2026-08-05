import { Box, Flex } from "@chakra-ui/react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ItineraryCard } from "@/components/ItineraryCard";
import { MapEmbed } from "@/components/MapEmbed";
import { Tag } from "@/components/Tag";
import { TRIP_DATES } from "@/lib/constants";
import { dayCostSum, formatYen, shortDate } from "@/lib/format";
import { getTripData } from "@/lib/trip-data";
import type { TripDay } from "@/lib/types";

const WEEKDAY_EN: Record<string, string> = {
  日: "SUN",
  一: "MON",
  二: "TUE",
  三: "WED",
  四: "THU",
  五: "FRI",
  六: "SAT",
};

export function generateStaticParams(): { date: string }[] {
  return TRIP_DATES.map((date) => ({ date }));
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<React.JSX.Element> {
  const { date } = await params;
  const data = getTripData();
  const day = data.days.find((d) => d.date === date);
  if (!day) notFound();

  const dayIndex = TRIP_DATES.indexOf(date) + 1;
  const subtotal = dayCostSum(day.items.map((i) => i.estimatedCostJpy));

  return (
    <Flex direction="column" minH="calc(100dvh - var(--tabbar-h))">
      <Box px={{ base: "20px", lg: "28px" }} pt="24px" pb="16px">
        <Flex align="baseline" gap="12px">
          <Box fontFamily="mono" fontSize="28px" fontWeight="600">
            {shortDate(day.date)}
          </Box>
          <Box fontFamily="pixel" fontSize="8px" color="mario.faint">
            {WEEKDAY_EN[day.weekdayZh] ?? ""} · DAY {dayIndex}
          </Box>
        </Flex>
        <Flex className="only-mobile" gap="8px" mt="12px" wrap="wrap">
          <Tag>區域 · {day.mainArea || "未定"}</Tag>
          {day.accommodation && <Tag>宿 · {day.accommodation}</Tag>}
        </Flex>
        {day.highlight && (
          <Box
            className="only-mobile"
            fontSize="12px"
            color="mario.dim"
            mt="10px"
          >
            重點:{day.highlight}
          </Box>
        )}
      </Box>
      <Box
        className="only-mobile"
        borderTopWidth="1px"
        borderColor="mario.line"
      />

      {day.items.length === 0 ? (
        <EmptyState
          title="這天還沒有行程"
          hint={`到 Google Sheets 的「${shortDate(day.date)} (${day.weekdayZh})」tab 新增第一筆行程後重新部署`}
        />
      ) : (
        <div className="day-grid">
          <Box className="panel-desktop" flex="1">
            {day.items.map((item, i) => (
              <Box key={`${item.timeSlot}-${item.name}`}>
                {i > 0 && (
                  <Box
                    borderTopWidth="1px"
                    borderColor="mario.line"
                    mx="20px"
                  />
                )}
                <ItineraryCard item={item} />
              </Box>
            ))}
            <Flex
              borderTopWidth="1px"
              borderColor="mario.line"
              px="20px"
              py="13px"
              justify="space-between"
              align="baseline"
            >
              <Box fontSize="12px" color="mario.dim">
                當日預估花費
              </Box>
              <Box
                fontFamily="mono"
                fontSize="16px"
                fontWeight="600"
                color="mario.yellow"
              >
                {formatYen(subtotal)}
              </Box>
            </Flex>
          </Box>
          <DayRail day={day} subtotal={subtotal} />
        </div>
      )}
    </Flex>
  );
}

/** Desktop 右側摘要欄(D2 定稿):DAY SUMMARY + TODO(待預約/候補中聚合)+ 迷你地圖 */
function DayRail({
  day,
  subtotal,
}: {
  day: TripDay;
  subtotal: number;
}): React.JSX.Element {
  const todos = day.items.filter(
    (i) => i.reservationStatus === "待預約" || i.reservationStatus === "候補中",
  );
  return (
    <aside className="day-rail only-desktop">
      <Box className="panel-desktop" w="full" p="16px">
        <Box fontFamily="pixel" fontSize="7px" color="mario.faint">
          DAY SUMMARY
        </Box>
        <RailKv k="區域">{day.mainArea || "未定"}</RailKv>
        <RailKv k="住宿">{day.accommodation || "-"}</RailKv>
        <RailKv k="筆數">
          <Box as="span" fontFamily="mono" fontSize="12px">
            {day.items.length}
          </Box>
        </RailKv>
        <Box borderTopWidth="1px" borderColor="mario.line" my="10px" />
        <RailKv k="預估花費">
          <Box
            as="span"
            fontFamily="mono"
            fontSize="15px"
            fontWeight="600"
            color="mario.yellow"
          >
            {formatYen(subtotal)}
          </Box>
        </RailKv>
      </Box>

      {(todos.length > 0 || day.highlight) && (
        <Box className="panel-desktop" p="16px">
          <Box fontFamily="pixel" fontSize="7px" color="mario.redT">
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
            <Box fontSize="11.5px" color="mario.faint" mt="8px">
              重點:{day.highlight}
            </Box>
          )}
        </Box>
      )}

      <Box className="panel-desktop" h="180px" position="relative">
        <MapEmbed area={day.mainArea} />
      </Box>
    </aside>
  );
}

function RailKv({
  k,
  children,
}: {
  k: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Flex justify="space-between" gap="12px" fontSize="12.5px" pt="10px">
      <Box color="mario.faint" flexShrink={0}>
        {k}
      </Box>
      <Box textAlign="right">{children}</Box>
    </Flex>
  );
}
