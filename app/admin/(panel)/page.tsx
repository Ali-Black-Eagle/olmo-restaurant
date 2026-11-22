import Link from "next/link";
import { TodayBoard } from "@/components/admin/timeline";
import { loadDayBookings, loadTimelineFrame } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { getRestaurant } from "@/lib/data";
import { addDays, formatDateLong, instantClock, isDateString, localDate, minutesOf } from "@/lib/time";

export const metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const { timezone } = await getRestaurant();
  const today = localDate(new Date(), timezone);
  const date = sp.date && isDateString(sp.date) ? sp.date : today;

  const [{ bookings }, frame, tables] = await Promise.all([
    loadDayBookings(date),
    loadTimelineFrame(date),
    db.diningTable.findMany({ where: { active: true } }),
  ]);
  tables.sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true }));
  const nowMin = date === today ? minutesOf(instantClock(new Date(), timezone)) : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.2rem]">{date === today ? "Today" : formatDateLong(date)}</h1>
          <p className="admin-muted">
            {formatDateLong(date)}
            {frame.note ? `. ${frame.note}` : ""}
          </p>
        </div>
        <nav aria-label="Change day" className="flex flex-wrap gap-2">
          <Link className="btn btn-secondary btn-sm" href={`/admin?date=${addDays(date, -1)}`}>
            Previous day
          </Link>
          {date !== today ? (
            <Link className="btn btn-secondary btn-sm" href="/admin">
              Today
            </Link>
          ) : null}
          <Link className="btn btn-secondary btn-sm" href={`/admin?date=${addDays(date, 1)}`}>
            Next day
          </Link>
        </nav>
      </div>
      <TodayBoard
        date={date}
        tables={tables.map((t) => ({ id: t.id, label: t.label, maxSeats: t.maxSeats, zone: t.zone }))}
        bookings={bookings}
        periods={frame.periods}
        nowMin={nowMin}
      />
    </>
  );
}
