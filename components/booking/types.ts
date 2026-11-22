export type BookingConfig = {
  maxParty: number;
  windowDays: number;
  timezone: string;
  /** Days of the week (0 = Sunday) the restaurant normally opens. */
  openDows: number[];
  /** Dates (yyyy-MM-dd) closed by special days. */
  closedDates: string[];
  phone: string;
  /** False when no database is configured: the flow explains booking is unavailable. */
  enabled: boolean;
};

export type Prefill = { party?: number; date?: string; time?: string };

export type AvailabilityResponse = {
  date: string;
  closed: boolean;
  note?: string | null;
  periods: { name: string; slots: { time: string; available: boolean }[] }[];
};
