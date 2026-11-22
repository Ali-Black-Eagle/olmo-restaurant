import { BookingsManager } from "@/components/admin/bookings-manager";
import { db } from "@/lib/db";
import { loadDayBookings, toDayBooking } from "@/lib/admin-data";
import { getRestaurant } from "@/lib/data";
import { isDateString, localDate } from "@/lib/time";

export const metadata = { title: "Bookings" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ date?: string; q?: string }> }) {
  const sp = await searchParams;
  const { timezone } = await getRestaurant();
  const today = localDate(new Date(), timezone);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const date = sp.date && isDateString(sp.date) ? sp.date : today;

  let bookings;
  if (q) {
    const rows = await db.booking.findMany({
      where: {
        OR: [
          { guestName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { ref: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 100,
      include: { tables: { include: { table: true } } },
    });
    bookings = rows.map((b) => toDayBooking(b, timezone));
  } else {
    bookings = (await loadDayBookings(date)).bookings;
  }

  return <BookingsManager date={date} q={q} today={today} bookings={bookings} />;
}
