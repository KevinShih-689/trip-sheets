import type { z } from 'zod';
import type {
  bnbCandidateSchema,
  flightSchema,
  itineraryItemSchema,
  roomSchema,
  tripDataSchema,
  tripDaySchema,
  tripMetaSchema,
  usjTicketSchema,
} from './schema';

export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type TripMeta = z.infer<typeof tripMetaSchema>;
export type TripDay = z.infer<typeof tripDaySchema>;
export type Flight = z.infer<typeof flightSchema>;
export type Room = z.infer<typeof roomSchema>;
export type UsjTicket = z.infer<typeof usjTicketSchema>;
export type BnbCandidate = z.infer<typeof bnbCandidateSchema>;
export type TripData = z.infer<typeof tripDataSchema>;
