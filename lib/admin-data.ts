import { db } from "@/lib/db";
import { dayBounds } from "@/lib/booking/data";
import { periodsForDate } from "@/lib/booking/slots";
import { getRestaurant, getWeeklyHours } from "@/lib/data";
import { instantClock, localDate, minutesOf } from "@/lib/time";

export type DayBooking = {
  id: string;
  ref: string;
  guestName: string;
  email: string;
  phone: string;
  note: string | null;
  partySize: number;
  status: "CONFIRMED" | "SEATED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  source: "WEB" | "ADMIN" | "PHONE";
  startsAt: string;
  endsAt: string;
  date: string;
  startMin: number;
  endMin: number;
  tableIds: string[];
  tableLabels: string[];
};

export async function loadDayBookings(date: string): Promise<{ bookings: DayBooking[]; timezone: string }> {
  const { timezone } = await getRestaurant();
  const { from, to } = dayBounds(date, timezone);
  const rows = await db.booking.findMany({
    where: { startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: "asc" },
    include: { tables: { include: { table: true } } },
  });
  const bookings = rows
    .filter((b) => localDate(b.startsAt, timezone) === date)
    .map((b) => toDayBooking(b, timezone));
  return { bookings, timezone };
}

type RowWithTables = Awaited<ReturnType<typeof db.booking.findMany<{ include: { tables: { include: { table: true } } } }>>>[number];

export function toDayBooking(b: RowWithTables, timezone: string): DayBooking {
  const startMin = minutesOf(instantClock(b.startsAt, timezone));
  return {
    id: b.id,
    ref: b.ref,
    guestName: b.guestName,
    email: b.email,
    phone: b.phone,
    note: b.note,
    partySize: b.partySize,
    status: b.status,
    source: b.source,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    date: localDate(b.startsAt, timezone),
    startMin,
    endMin: startMin + Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000),
    tableIds: b.tables.map((t) => t.tableId),
    tableLabels: b.tables.map((t) => t.table.label),
  };
}

export async function loadTimelineFrame(date: string) {
  const weekly = await getWeeklyHours();
  const special = await db.specialDay.findUnique({ where: { date: new Date(`${date}T00:00:00.000Z`) } });
  const periods = periodsForDate(
    date,
    weekly,
    special ? { closed: special.closed, note: special.note, periods: special.periods as never } : null,
  );
  return { periods, note: special?.note ?? null };
}
