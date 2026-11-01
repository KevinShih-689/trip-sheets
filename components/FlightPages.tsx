import { Box, Flex } from '@chakra-ui/react';
import { BoardingPass, TONE_STYLES } from './backlog-cards';
import { SwipeRow } from './SwipeRow';
import type { FlightLayout, Traveler } from '@/lib/flight-groups';

const UNNAMED = '未標示';

function travelerName(t: Traveler): string {
  return t.name || UNNAMED;
}

/** Colour key shown beside the section title: one swatch + name per traveler. */
export function TravelerLegend({
  travelers,
}: {
  travelers: readonly Traveler[];
}): React.JSX.Element | null {
  if (travelers.length < 2) return null;
  return (
    <Flex as="ul" gap="14px" ml="auto" listStyleType="none" aria-label="乘客顏色">
      {travelers.map((t) => {
        const mark = TONE_STYLES[t.tone].mark;
        return (
          <Flex as="li" key={t.name} align="center" gap="6px" fontSize="13px" color={mark}>
            <Box
              as="span"
              w="12px"
              h="12px"
              flexShrink={0}
              borderRadius="2px"
              aria-hidden="true"
              style={{ background: mark }}
            />
            {travelerName(t)}
          </Flex>
        );
      })}
    </Flex>
  );
}

function EmptySlot({ who, label }: { who: string; label: string }): React.JSX.Element {
  return (
    <Flex
      align="center"
      justify="center"
      minH="80px"
      my="10px"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="pixel.line"
      borderRadius="12px"
      fontSize="12px"
      color="pixel.faint"
    >
      {who} 無{label}航班
    </Flex>
  );
}

/**
 * Flights as pages: one page per direction (去程, 回程, …), one row per traveler.
 * Mobile swipes between pages; desktop shows the pages side by side.
 */
export function FlightPages({ layout }: { layout: FlightLayout }): React.JSX.Element {
  return (
    <SwipeRow label="機票" className="flight-pages">
      {layout.pages.map((page) => (
        <div className="swipe-item swipe-item--page" key={page.label}>
          <div className="flight-page" role="group" aria-label={page.label}>
            {page.rows.map((flights, i) => {
              const traveler = layout.travelers[i];
              if (!traveler) return null;
              if (flights.length === 0) {
                return (
                  <EmptySlot key={traveler.name} who={travelerName(traveler)} label={page.label} />
                );
              }
              return flights.map((f) => (
                <BoardingPass
                  key={`${f.traveler}-${f.flightNo}-${f.date}`}
                  flight={f}
                  tone={traveler.tone}
                />
              ));
            })}
          </div>
        </div>
      ))}
    </SwipeRow>
  );
}
