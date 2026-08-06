import { z } from 'zod';

export const CATEGORIES = [
  '景點',
  '餐廳',
  '咖啡/甜點',
  '購物',
  '交通',
  '住宿',
  '體驗/活動',
] as const;

export const RESERVATION_STATUSES = ['不需預約', '待預約', '已預約', '候補中'] as const;

export const itineraryItemSchema = z.object({
  timeSlot: z.string(),
  category: z.enum(CATEGORIES).nullable(),
  name: z.string().min(1),
  area: z.string(),
  transport: z.string(),
  openingHours: z.string(),
  estimatedCostJpy: z.number().nullable(),
  reservationStatus: z.enum(RESERVATION_STATUSES).nullable(),
  link: z.string().nullable(),
  note: z.string(),
});

export const tripDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdayZh: z.string(),
  mainArea: z.string(),
  accommodation: z.string(),
  highlight: z.string(),
  items: z.array(itineraryItemSchema),
});

// 注意:Flight 無 PNR、Room 無訂單編號 — 敏感欄位於 fetch 層即丟棄(spec §3.2)
export const flightSchema = z.object({
  direction: z.string(),
  date: z.string(),
  airline: z.string(),
  flightNo: z.string(),
  from: z.string(),
  departTime: z.string(),
  to: z.string(),
  arriveTime: z.string(),
  terminal: z.string(),
  priceTwd: z.number().nullable(),
  baggage: z.string(),
  note: z.string(),
});

export const roomSchema = z.object({
  name: z.string(),
  area: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  nights: z.number().nullable(),
  roomType: z.string(),
  totalPrice: z.string(),
  platform: z.string(),
  paymentStatus: z.string(),
  freeCancelDeadline: z.string(),
  addressOrLink: z.string(),
  note: z.string(),
});

export const usjTicketSchema = z.object({
  item: z.string(),
  useDate: z.string(),
  ticketName: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  totalPrice: z.number().nullable(),
  platform: z.string(),
  purchaseStatus: z.string(),
  redemption: z.string(),
  note: z.string(),
});

export const bnbCandidateSchema = z.object({
  name: z.string(),
  areaStation: z.string(),
  walkToStation: z.string(),
  roomType: z.string(),
  pricePerNight: z.string(),
  totalPriceEst: z.string(),
  rating: z.string(),
  pros: z.string(),
  cons: z.string(),
  link: z.string().nullable(),
  status: z.string(),
  note: z.string(),
});

export const tripMetaSchema = z.object({
  title: z.string().min(1),
  eyebrow: z.string(),
  splashWorld: z.string(),
});

export const tripDataSchema = z.object({
  generatedAt: z.string(),
  meta: tripMetaSchema,
  days: z.array(tripDaySchema),
  backlog: z.object({
    flights: z.array(flightSchema),
    rooms: z.array(roomSchema),
    usj: z.array(usjTicketSchema),
    bnbCandidates: z.array(bnbCandidateSchema),
  }),
});
