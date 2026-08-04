import { Box, Flex } from '@chakra-ui/react';
import { BnbCard, BoardingPass, HotelCard, TicketRow } from '@/components/backlog-cards';
import { EmptyState } from '@/components/EmptyState';
import { getTripData } from '@/lib/trip-data';

function SectionTitle({ zh, en }: { zh: string; en: string }): React.JSX.Element {
  return (
    <Flex px="20px" pt="20px" pb="8px" align="baseline" gap="10px">
      <Box fontSize="13px" fontWeight="700" letterSpacing="0.06em">
        {zh}
      </Box>
      <Box fontFamily="pixel" fontSize="7px" color="mario.faint">
        {en}
      </Box>
    </Flex>
  );
}

function SectionEmpty({ text }: { text: string }): React.JSX.Element {
  return (
    <Box mx="16px" my="8px" px="16px" py="18px" borderWidth="1px" borderColor="mario.line" borderRadius="10px" textAlign="center">
      <Box fontFamily="pixel" fontSize="8px" color="mario.faint">
        NO DATA
      </Box>
      <Box fontSize="12px" color="mario.dim" mt="8px">
        {text}
      </Box>
    </Box>
  );
}

export default function BacklogPage(): React.JSX.Element {
  const { backlog } = getTripData();
  const allEmpty =
    backlog.flights.length === 0 &&
    backlog.rooms.length === 0 &&
    backlog.usj.length === 0 &&
    backlog.bnbCandidates.length === 0;

  if (allEmpty) {
    return (
      <Flex direction="column" minH="calc(100dvh - var(--tabbar-h))">
        <Box px="20px" pt="24px" pb="4px">
          <Box fontFamily="pixel" fontSize="8px" color="mario.faint">
            PRE-TRIP
          </Box>
          <Box fontSize="22px" fontWeight="700" mt="8px">
            行前資訊
          </Box>
        </Box>
        <EmptyState title="還沒有行前資料" hint="到 Google Sheets 的「Backlog」tab 填入機票/住宿資訊後重新部署" />
      </Flex>
    );
  }

  return (
    <Box pb="20px">
      <Box px="20px" pt="24px" pb="4px">
        <Box fontFamily="pixel" fontSize="8px" color="mario.faint">
          PRE-TRIP
        </Box>
        <Box fontSize="22px" fontWeight="700" mt="8px">
          行前資訊
        </Box>
      </Box>

      <SectionTitle zh="機票" en="BOARDING" />
      {backlog.flights.length > 0 ? (
        backlog.flights.map((f) => <BoardingPass key={`${f.flightNo}-${f.date}`} flight={f} />)
      ) : (
        <SectionEmpty text="尚未填入機票資訊" />
      )}

      <SectionTitle zh="住宿" en="STAY" />
      {backlog.rooms.length > 0 ? (
        backlog.rooms.map((r) => <HotelCard key={`${r.name}-${r.checkIn}`} room={r} />)
      ) : (
        <SectionEmpty text="尚未填入已訂住宿" />
      )}

      <SectionTitle zh="環球影城" en="USJ" />
      {backlog.usj.length > 0 ? (
        backlog.usj.map((t) => <TicketRow key={t.item} ticket={t} />)
      ) : (
        <SectionEmpty text="尚未填入環球影城項目" />
      )}

      <SectionTitle zh="民宿口袋名單" en="SHORTLIST" />
      {backlog.bnbCandidates.length > 0 ? (
        backlog.bnbCandidates.map((b) => <BnbCard key={b.name} bnb={b} />)
      ) : (
        <SectionEmpty text="尚未加入民宿候選" />
      )}
    </Box>
  );
}
