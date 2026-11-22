import { NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { computeAvailability } from "@/lib/booking/availability";
import { dayBounds, loadBusy, loadContext } from "@/lib/booking/data";
import { isDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

const query = z.object({
  date: z.string().refine(isDateString, "Invalid date"),
  party: z.coerce.number().int().min(1).max(20),
});

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = query.safeParse({ date: searchParams.get("date"), party: searchParams.get("party") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date or party size" }, { status: 400, headers: noStore });
  }
  if (!hasDatabase) {
    return NextResponse.json({ error: "Booking is not configured yet" }, { status: 503, headers: noStore });
  }

  try {
    const { date, party } = parsed.data;
    const ctx = await loadContext(db, date);
    if (!ctx) return NextResponse.json({ error: "Booking is not configured yet" }, { status: 503, headers: noStore });
    const { from, to } = dayBounds(date, ctx.settings.timezone);
    const busy = await loadBusy(db, from, to);
    const result = computeAvailability({
      date,
      partySize: party,
      now: new Date(),
      settings: ctx.settings,
      weekly: ctx.weekly,
      special: ctx.special,
      tables: ctx.tables,
      combos: ctx.combos,
      busy,
    });
    return NextResponse.json(
      { date: result.date, closed: result.closed, note: result.note, periods: result.periods },
      { headers: noStore },
    );
  } catch (e) {
    console.error("[availability]", e);
    return NextResponse.json({ error: "Could not load times" }, { status: 500, headers: noStore });
  }
}
