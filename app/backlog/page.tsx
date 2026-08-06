import { Box, Flex } from '@chakra-ui/react';
import { BnbCard, BoardingPass, HotelCard, TicketRow } from '@/components/backlog-cards';
import { EmptyState } from '@/components/EmptyState';
import { QBlock } from '@/components/QBlock';
import { getTripData } from '@/lib/trip-data';

function SectionTitle({ zh, en }: { zh: string; en: string }): React.JSX.Element {
  return (
    <Flex className="sec-title" px="20px" pt="20px" pb="8px" align="baseline" gap="10px">
      <Box fontSize="13px" fontWeight="700" letterSpacing="0.06em">
        {zh}
      </Box>
      <Box fontFamily="pixel" fontSize="7px" color="pixel.faint">
        {en}
      </Box>
    </Flex>
  );
}

/** 區塊級空狀態:同一套問號方塊元件的小尺寸版(D3 定稿) */
function SectionEmpty({ text }: { text: string }): React.JSX.Element {
  return (
    <Flex mx="16px" my="8px" px="16px" py="16px" borderWidth="1px" borderColor="pixel.line" borderRadius="10px" align="center" gap="16px">
      <QBlock size="sm" idle={false} />
      <Box>
        <Box fontFamily="pixel" fontSize="7px" color="pixel.yellow">
          NO DATA
        </Box>
        <Box fontSize="12px" color="pixel.dim" mt="6px">
          {text}
        </Box>
      </Box>
    </Flex>
  );
}

export default function BacklogPage(): React.JSX.Element {
  const { backlog } = getTripData();
  const allEmpty =
    backlog.flights.length === 0 &&
    backlog.rooms.length === 0 &&
    backlog.usj.length === 0 &&
    backlog.bnbCandidates.length === 0;

  const header = (
    <Box px={{ base: '20px', lg: '28px' }} pt="24px" pb="4px">
      <Box fontFamily="pixel" fontSize="8px" color="pixel.faint">
        PRE-TRIP
      </Box>
      <Box fontSize="22px" fontWeight="700" mt="8px">
        行前資訊
      </Box>
    </Box>
  );

  if (allEmpty) {
    return (
      <Flex direction="column" minH="calc(100dvh - var(--tabbar-h))">
        {header}
        <EmptyState title="還沒有行前資料" hint="到 Google Sheets 的「Backlog」tab 填入機票/住宿資訊後重新部署" />
      </Flex>
    );
  }

  return (
    <Box pb="20px">
      {header}
      <div className="bl-grid">
        <section className="bl-flights">
          <SectionTitle zh="機票" en="BOARDING" />
          {backlog.flights.length > 0 ? (
            backlog.flights.map((f) => <BoardingPass key={`${f.flightNo}-${f.date}`} flight={f} />)
          ) : (
            <SectionEmpty text="尚未填入機票資訊" />
          )}
        </section>

        <section className="bl-stay">
          <SectionTitle zh="住宿" en="STAY" />
          {backlog.rooms.length > 0 ? (
            <div className="cards-h">
              {backlog.rooms.map((r) => (
                <HotelCard key={`${r.name}-${r.checkIn}`} room={r} />
              ))}
            </div>
          ) : (
            <SectionEmpty text="尚未填入已訂住宿" />
          )}
        </section>

        <section className="bl-usj">
          <SectionTitle zh="環球影城" en="USJ" />
          {backlog.usj.length > 0 ? (
            backlog.usj.map((t) => <TicketRow key={t.item} ticket={t} />)
          ) : (
            <SectionEmpty text="尚未填入環球影城項目" />
          )}
        </section>

        <section className="bl-bnb">
          <SectionTitle zh="民宿口袋名單" en="SHORTLIST" />
          {backlog.bnbCandidates.length > 0 ? (
            <div className="cards-h">
              {backlog.bnbCandidates.map((b) => (
                <BnbCard key={b.name} bnb={b} />
              ))}
            </div>
          ) : (
            <SectionEmpty text="尚未加入民宿候選" />
          )}
        </section>
      </div>
    </Box>
  );
}
