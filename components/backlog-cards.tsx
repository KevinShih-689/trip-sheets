import { Box, Flex } from '@chakra-ui/react';
import { Tag, statusVariant } from './Tag';
import { formatYen } from '@/lib/format';
import type { BnbCandidate, Flight, Room, UsjTicket } from '@/lib/types';

/** 登機證卡(定稿:紅色帶 + 虛線撕線 + 條碼) */
export function BoardingPass({ flight }: { flight: Flight }): React.JSX.Element {
  return (
    <Box
      position="relative"
      bg="pixel.surface2"
      borderWidth="1px"
      borderColor="pixel.line"
      borderRadius="12px"
      mx="16px"
      my="10px"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        align="center"
        px="16px"
        py="10px"
        style={{ background: 'rgba(229,37,33,0.26)' }}
      >
        <Box fontFamily="mono" fontSize="13px" fontWeight="600">
          {flight.airline} · {flight.flightNo}
        </Box>
        <Box fontFamily="mono" fontSize="11px" style={{ color: '#F5B8B0' }}>
          {flight.direction} · {flight.date}
        </Box>
      </Flex>
      <Box px="16px" pt="14px" pb="16px">
        <Flex align="center">
          <Box>
            <Box fontFamily="mono" fontSize="24px" lineHeight="1" fontWeight="600">
              {flight.departTime}
            </Box>
            <Box fontFamily="pixel" fontSize="7px" color="pixel.faint">
              {flight.from}
            </Box>
          </Box>
          <Flex flex="1" align="center" gap="4px" mx="4px">
            <Box w="5px" h="5px" borderRadius="50%" bg="pixel.faint" flexShrink={0} />
            <Box
              flex="1"
              borderTopWidth="1px"
              borderTopStyle="dashed"
              borderColor="rgba(235,240,255,0.25)"
            />
            <Box fontFamily="mono" fontSize="10px" color="pixel.faint">
              {flight.terminal}
            </Box>
            <Box
              flex="1"
              borderTopWidth="1px"
              borderTopStyle="dashed"
              borderColor="rgba(235,240,255,0.25)"
            />
            <Box w="5px" h="5px" borderRadius="50%" bg="pixel.faint" flexShrink={0} />
          </Flex>
          <Box textAlign="right">
            <Box fontFamily="mono" fontSize="24px" lineHeight="1" fontWeight="600">
              {flight.arriveTime}
            </Box>
            <Box fontFamily="pixel" fontSize="7px" color="pixel.faint">
              {flight.to}
            </Box>
          </Box>
        </Flex>
      </Box>
      <Flex
        position="relative"
        justify="space-between"
        align="center"
        px="16px"
        py="11px"
        borderTopWidth="1px"
        borderTopStyle="dashed"
        borderColor="rgba(235,240,255,0.22)"
      >
        <span className="bstub-notch" style={{ left: -8 }} />
        <span className="bstub-notch" style={{ right: -8 }} />
        <Box fontSize="11.5px" color="pixel.dim">
          行李 {flight.baggage || '-'}
        </Box>
        <div className="barcode" />
      </Flex>
    </Box>
  );
}

function KvRow({ k, children }: { k: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Flex justify="space-between" gap="12px" fontSize="12.5px" py="5px">
      <Box color="pixel.faint" flexShrink={0}>
        {k}
      </Box>
      <Box textAlign="right">{children}</Box>
    </Flex>
  );
}

/** 住宿卡(定稿:check-in/out 雙欄 + 晚數膠囊) */
export function HotelCard({ room }: { room: Room }): React.JSX.Element {
  return (
    <Box
      bg="pixel.surface2"
      borderWidth="1px"
      borderColor="pixel.line"
      borderRadius="12px"
      mx="16px"
      my="10px"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" px="16px" pt="13px" pb="11px">
        <Box fontSize="14px" fontWeight="500">
          {room.name}
        </Box>
        <Tag variant={statusVariant(room.paymentStatus)}>{room.paymentStatus || '未付款'}</Tag>
      </Flex>
      <Flex
        align="center"
        gap="12px"
        px="16px"
        py="12px"
        borderYWidth="1px"
        borderColor="pixel.line"
        style={{ background: 'rgba(67,176,71,0.08)' }}
      >
        <Box flex="1">
          <Box fontFamily="pixel" fontSize="7px" color="pixel.faint" mb="6px">
            CHECK-IN
          </Box>
          <Box fontFamily="mono" fontSize="19px" lineHeight="1" fontWeight="600">
            {room.checkIn.slice(5).replace('-', '/') || room.checkIn}
          </Box>
        </Box>
        {room.nights !== null && (
          <Box
            fontFamily="mono"
            fontSize="11px"
            fontWeight="500"
            color="pixel.greenT"
            borderWidth="1px"
            borderColor="rgba(67,176,71,0.4)"
            borderRadius="999px"
            px="10px"
            py="5px"
            flexShrink={0}
          >
            {room.nights} 晚
          </Box>
        )}
        <Box flex="1" textAlign="right">
          <Box fontFamily="pixel" fontSize="7px" color="pixel.faint" mb="6px">
            CHECK-OUT
          </Box>
          <Box fontFamily="mono" fontSize="19px" lineHeight="1" fontWeight="600">
            {room.checkOut.slice(5).replace('-', '/') || room.checkOut}
          </Box>
        </Box>
      </Flex>
      <Box px="16px" pt="10px" pb="13px">
        <KvRow k="房型">{room.roomType || '-'}</KvRow>
        <KvRow k="平台">{room.platform || '-'}</KvRow>
        <KvRow k="總價">{room.totalPrice || '-'}</KvRow>
        {room.freeCancelDeadline && (
          <KvRow k="免費取消">
            <Box as="span" fontWeight="500" color="pixel.redT">
              {room.freeCancelDeadline} 前
            </Box>
          </KvRow>
        )}
        {room.addressOrLink && (
          <KvRow k="地址">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.addressOrLink)}`}
              target="_blank"
              rel="noreferrer"
            >
              {room.addressOrLink} ↗
            </a>
          </KvRow>
        )}
        {room.note && <KvRow k="備註">{room.note}</KvRow>}
      </Box>
    </Box>
  );
}

/** USJ 票根列(定稿:虛線撕線 + 狀態 stub) */
export function TicketRow({ ticket }: { ticket: UsjTicket }): React.JSX.Element {
  const meta = [
    ticket.useDate.slice(5).replace('-', '/') || ticket.useDate,
    ticket.quantity !== null ? `${ticket.quantity} 張` : '',
    ticket.unitPrice !== null ? `${formatYen(ticket.unitPrice)}/人` : '',
    ticket.platform,
    ticket.note,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Flex
      bg="pixel.surface2"
      borderWidth="1px"
      borderColor="pixel.line"
      borderRadius="10px"
      mx="16px"
      my="8px"
      overflow="hidden"
      align="stretch"
    >
      <Box flex="1" px="14px" py="12px">
        <Box fontSize="13.5px" fontWeight="500">
          {ticket.item}
        </Box>
        {meta && (
          <Box fontSize="11.5px" color="pixel.faint" mt="3px">
            {meta}
          </Box>
        )}
      </Box>
      <Flex
        w="92px"
        flexShrink={0}
        align="center"
        justify="center"
        borderLeftWidth="1px"
        borderLeftStyle="dashed"
        borderColor="rgba(235,240,255,0.22)"
      >
        <Tag variant={statusVariant(ticket.purchaseStatus)}>{ticket.purchaseStatus || '-'}</Tag>
      </Flex>
    </Flex>
  );
}

/** 民宿比較卡(定稿:評分 + 優缺點 +/−) */
export function BnbCard({ bnb }: { bnb: BnbCandidate }): React.JSX.Element {
  return (
    <Box
      bg="pixel.surface"
      borderWidth="1px"
      borderColor="pixel.line"
      borderRadius="12px"
      mx="16px"
      my="10px"
      px="16px"
      py="14px"
    >
      <Flex justify="space-between" align="center">
        <Flex align="center" gap="8px">
          <Box fontSize="14px" fontWeight="500">
            {bnb.link ? (
              <a href={bnb.link} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                {bnb.name}
              </a>
            ) : (
              bnb.name
            )}
          </Box>
          {bnb.rating && (
            <Box fontFamily="mono" fontSize="12px" fontWeight="600" color="pixel.yellow">
              {bnb.rating}
            </Box>
          )}
        </Flex>
        <Tag variant={statusVariant(bnb.status)}>{bnb.status || '候選'}</Tag>
      </Flex>
      <Box mt="8px">
        <KvRow k="位置">{[bnb.areaStation, bnb.walkToStation].filter(Boolean).join(' ')}</KvRow>
        <KvRow k="價格">
          <Box as="span" fontFamily="mono" fontSize="12px">
            {[bnb.pricePerNight && `${bnb.pricePerNight}/晚`, bnb.totalPriceEst]
              .filter(Boolean)
              .join(' · ')}
          </Box>
        </KvRow>
        {bnb.roomType && <KvRow k="房型">{bnb.roomType}</KvRow>}
      </Box>
      {(bnb.pros || bnb.cons) && (
        <Box mt="8px">
          {bnb.pros && (
            <Flex gap="8px" fontSize="12px" py="3px">
              <Box
                fontFamily="mono"
                fontSize="11px"
                fontWeight="500"
                w="14px"
                flexShrink={0}
                color="pixel.greenT"
              >
                +
              </Box>
              <Box color="pixel.dim">{bnb.pros}</Box>
            </Flex>
          )}
          {bnb.cons && (
            <Flex gap="8px" fontSize="12px" py="3px">
              <Box
                fontFamily="mono"
                fontSize="11px"
                fontWeight="500"
                w="14px"
                flexShrink={0}
                color="pixel.redT"
              >
                −
              </Box>
              <Box color="pixel.dim">{bnb.cons}</Box>
            </Flex>
          )}
        </Box>
      )}
    </Box>
  );
}
