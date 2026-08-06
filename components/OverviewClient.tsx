"use client";

import { Box, Flex } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MapEmbed } from "./MapEmbed";
import { Tag } from "./Tag";
import { dayCostSum, formatGeneratedAt, formatYen } from "@/lib/format";
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

function todayIso(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Props {
  days: readonly TripDay[];
  generatedAt: string;
  title: string;
  eyebrow: string;
}

export function OverviewClient({
  days,
  generatedAt,
  title,
  eyebrow,
}: Props): React.JSX.Element {
  const first = days[0]?.date ?? "";
  const [focusDate, setFocusDate] = useState<string>(first);
  const [isToday, setIsToday] = useState<boolean>(false);

  // 依裝置日期自動 focus 當天(spec §4.2);SSR 先渲染第一天避免 hydration mismatch
  useEffect(() => {
    const t = todayIso();
    if (days.some((d) => d.date === t)) {
      setFocusDate(t);
      setIsToday(true);
    }
  }, [days]);

  const focusDay = useMemo(
    () => days.find((d) => d.date === focusDate),
    [days, focusDate],
  );
  const totalCost = useMemo(
    () =>
      days.reduce(
        (sum, d) => sum + dayCostSum(d.items.map((i) => i.estimatedCostJpy)),
        0,
      ),
    [days],
  );
  const focusTag = `${isToday && focusDate === todayIso() ? "TODAY" : "FOCUS"} · ${focusDate.slice(5).replace("-", "/")}`;

  return (
    <Box className="ov-root">
      {/* Mobile header(定稿不動) */}
      <Box className="only-mobile" px="20px" pt="24px" pb="14px">
        <Box
          fontFamily="pixel"
          fontSize="8px"
          letterSpacing="0.06em"
          color="pixel.faint"
        >
          {eyebrow}
        </Box>
        <Box fontSize="24px" fontWeight="700" letterSpacing="0.02em" mt="10px">
          {title}
        </Box>
      </Box>
      {/* Desktop header(D1:標題 + TODAY tag;trip 標題已在 sidebar) */}
      <Box className="only-desktop" px="28px" pt="24px" pb="16px">
        <Flex justify="space-between" align="baseline">
          <Box fontSize="20px" fontWeight="700">
            總覽
          </Box>
          <Tag variant="hot">{focusTag}</Tag>
        </Flex>
      </Box>

      <div className="ov-body">
        {/* 地圖:mobile 148px 小窗 / desktop 填滿右欄 */}
        <Box
          className="ov-map"
          mx="16px"
          mb="14px"
          h="148px"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="pixel.line"
          overflow="hidden"
        >
          <MapEmbed area={focusDay?.mainArea ?? ""} />
          <Box
            className="only-mobile"
            position="absolute"
            right="10px"
            top="10px"
          >
            <Tag variant="hot">{focusTag}</Tag>
          </Box>
        </Box>

        <Box className="ov-list panel-desktop">
          {days.map((day, idx) => {
            const focused = day.date === focusDate;
            const cost = dayCostSum(day.items.map((i) => i.estimatedCostJpy));
            const dayNum = String(Number(day.date.slice(8)));
            return (
              <Box key={day.date}>
                {idx > 0 && (
                  <Box
                    borderTopWidth="1px"
                    borderColor="pixel.line"
                    mx="20px"
                  />
                )}
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
                  bg={focused ? "rgba(251,208,0,0.07)" : "transparent"}
                  onClick={() => setFocusDate(day.date)}
                >
                  <Box w="42px" flexShrink={0}>
                    <Box
                      fontFamily="mono"
                      fontSize="24px"
                      lineHeight="1"
                      fontWeight="500"
                      color={focused ? "pixel.yellow" : "pixel.dim"}
                    >
                      {dayNum}
                    </Box>
                    <Box
                      fontFamily="pixel"
                      fontSize="7px"
                      mt="4px"
                      color={focused ? "pixel.yellow" : "pixel.faint"}
                      opacity={focused ? 0.8 : 1}
                    >
                      {WEEKDAY_EN[day.weekdayZh] ?? ""}
                    </Box>
                  </Box>
                  <Box flex="1">
                    <Box fontSize="14px" fontWeight="500">
                      {day.mainArea || "(未定)"}
                    </Box>
                    <Box fontSize="11.5px" color="pixel.faint" mt="3px">
                      {day.accommodation
                        ? `宿:${day.accommodation}`
                        : `${day.items.length} 筆行程`}
                    </Box>
                  </Box>
                  <Box
                    fontFamily="mono"
                    fontSize="13px"
                    fontWeight="500"
                    color={focused ? "pixel.yellow" : "pixel.dim"}
                  >
                    {formatYen(cost)}
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </Box>
      </div>

      {/* Mobile footer(desktop 由 sidebar sfoot 呈現) */}
      <Flex
        className="only-mobile"
        borderTopWidth="1px"
        borderColor="pixel.line"
        px="20px"
        py="12px"
        justify="space-between"
        align="baseline"
      >
        <Box fontSize="11px" color="pixel.faint">
          資料更新於 {formatGeneratedAt(generatedAt)}
        </Box>
        <Box
          fontFamily="mono"
          fontSize="13px"
          fontWeight="500"
          color="pixel.yellow"
        >
          Σ {formatYen(totalCost)}
        </Box>
      </Flex>
    </Box>
  );
}
