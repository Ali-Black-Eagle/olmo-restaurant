export type Period = { name: string; opensAt: string; lastSeating: string; closesAt: string };
export type WeeklyPeriod = Period & { dayOfWeek: number };
export type SpecialDayInfo = { closed: boolean; note?: string | null; periods?: Period[] | null };
export type DurationRule = { maxParty: number; minutes: number };

export type RulesSettings = {
  timezone: string;
  slotIntervalMin: number;
  maxPartyOnline: number;
  bookingWindowDays: number;
  minNoticeMin: number;
  durations: DurationRule[];
};

export type TableInfo = { id: string; label: string; minSeats: number; maxSeats: number; active: boolean };
export type ComboInfo = { id: string; tableIds: string[]; minSeats: number; maxSeats: number };
export type BusyRange = { tableId: string; start: Date; end: Date };

export type Slot = { time: string; startsAt: Date };
export type SlotGroup = { name: string; slots: Slot[] };

export type AvailabilitySlot = { time: string; available: boolean };
export type AvailabilityGroup = { name: string; slots: AvailabilitySlot[] };
export type AvailabilityResult = {
  date: string;
  closed: boolean;
  note?: string | null;
  periods: AvailabilityGroup[];
};

export type BookingErrorCode =
  | "INVALID"
  | "CLOSED"
  | "TOO_SOON"
  | "OUTSIDE_WINDOW"
  | "PARTY_TOO_LARGE"
  | "NOT_OFFERED"
  | "ALREADY_BOOKED"
  | "SLOT_TAKEN"
  | "RATE_LIMITED"
  | "BOT"
  | "UNAVAILABLE";
