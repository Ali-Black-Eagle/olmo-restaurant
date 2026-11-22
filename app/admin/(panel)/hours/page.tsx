import { HoursEditor, type PeriodRow } from "@/components/admin/hours-editor";
import { db } from "@/lib/db";
import { getWeeklyHours } from "@/lib/data";
import { localDate } from "@/lib/time";
import { getRestaurant } from "@/lib/data";

export const metadata = { title: "Opening hours" };

export default async function HoursPage() {
  const [weekly, restaurant] = await Promise.all([getWeeklyHours(), getRestaurant()]);
  const today = localDate(new Date(), restaurant.timezone);
  const special = await db.specialDay.findMany({ where: { date: { gte: new Date(`${today}T00:00:00.000Z`) } }, orderBy: { date: "asc" } });

  const byDay: Record<number, PeriodRow[]> = {};
  for (const p of weekly) (byDay[p.dayOfWeek] ??= []).push({ name: p.name, opensAt: p.opensAt, lastSeating: p.lastSeating, closesAt: p.closesAt });

  return (
    <>
      <h1 className="mb-6 text-[2.2rem]">Opening hours</h1>
      <HoursEditor
        weekly={byDay}
        special={special.map((s) => ({
          id: s.id,
          date: s.date.toISOString().slice(0, 10),
          closed: s.closed,
          note: s.note,
          periods: (s.periods as PeriodRow[] | null) ?? null,
        }))}
      />
    </>
  );
}
