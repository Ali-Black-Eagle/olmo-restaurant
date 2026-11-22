import type { PrismaClient } from "@/generated/prisma/client";
import { addDays, toUtc } from "@/lib/time";
import { DEFAULT_DURATIONS } from "./slots";
import type {
  BusyRange,
  ComboInfo,
  DurationRule,
  Period,
  RulesSettings,
  SpecialDayInfo,
  TableInfo,
  WeeklyPeriod,
} from "./types";

export type BookingContext = {
  settings: RulesSettings;
  weekly: WeeklyPeriod[];
  special: SpecialDayInfo | null;
  tables: TableInfo[];
  combos: ComboInfo[];
};

export function toRulesSettings(s: {
  timezone: string;
  slotIntervalMin: number;
  maxPartyOnline: number;
  bookingWindowDays: number;
  minNoticeMin: number;
  durations: unknown;
}): RulesSettings {
  const durations = Array.isArray(s.durations) && s.durations.length > 0 ? (s.durations as DurationRule[]) : DEFAULT_DURATIONS;
  return {
    timezone: s.timezone,
    slotIntervalMin: s.slotIntervalMin,
    maxPartyOnline: s.maxPartyOnline,
    bookingWindowDays: s.bookingWindowDays,
    minNoticeMin: s.minNoticeMin,
    durations,
  };
}

/** Loads everything needed to evaluate one date: rules, hours, special day, tables. */
export async function loadContext(db: PrismaClient, date: string): Promise<BookingContext | null> {
  const [settings, periods, special, tables, combos] = await Promise.all([
    db.settings.findUnique({ where: { id: 1 } }),
    db.servicePeriod.findMany(),
    db.specialDay.findUnique({ where: { date: new Date(`${date}T00:00:00.000Z`) } }),
    db.diningTable.findMany(),
    db.tableCombo.findMany(),
  ]);
  if (!settings) return null;
  return {
    settings: toRulesSettings(settings),
    weekly: periods.map((p) => ({
      dayOfWeek: p.dayOfWeek,
      name: p.name,
      opensAt: p.opensAt,
      lastSeating: p.lastSeating,
      closesAt: p.closesAt,
    })),
    special: special
      ? { closed: special.closed, note: special.note, periods: (special.periods as Period[] | null) ?? null }
      : null,
    tables: tables.map((t) => ({
      id: t.id,
      label: t.label,
      minSeats: t.minSeats,
      maxSeats: t.maxSeats,
      active: t.active,
    })),
    combos: combos.map((c) => ({ id: c.id, tableIds: c.tableIds, minSeats: c.minSeats, maxSeats: c.maxSeats })),
  };
}

type BusyRow = { tableId: string; s: Date; e: Date };

/** All table holds overlapping [from, to). One query. */
export async function loadBusy(db: PrismaClient, from: Date, to: Date, excludeBookingId?: string): Promise<BusyRange[]> {
  const rows = await db.$queryRaw<BusyRow[]>`
    SELECT "tableId", lower("during") AS s, upper("during") AS e
    FROM "BookingTable"
    WHERE "during" && tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)')
      AND (${excludeBookingId ?? null}::text IS NULL OR "bookingId" <> ${excludeBookingId ?? null}::text)`;
  return rows.map((r) => ({ tableId: r.tableId, start: new Date(r.s), end: new Date(r.e) }));
}

/** The span of a restaurant day (generous: midnight to midnight plus the longest booking). */
export function dayBounds(date: string, tz: string): { from: Date; to: Date } {
  return { from: toUtc(date, "00:00", tz), to: toUtc(addDays(date, 1), "06:00", tz) };
}
