import type { PrismaClient } from "@/generated/prisma/client";
import { candidateAssignments } from "./assign";
import { isExclusionViolation } from "./create";
import { dayBounds, loadBusy, loadContext } from "./data";
import { checkRules } from "./rules";
import { durationFor } from "./slots";
import type { BookingErrorCode } from "./types";
import { toUtc } from "@/lib/time";

export type MoveInput = { date: string; time: string; partySize: number };
export type MoveResult = { ok: true } | { ok: false; error: BookingErrorCode | "NOT_FOUND" | "NOT_EDITABLE"; message: string };

/**
 * Staff edit of time / party size. Goes through the same engine and the same database
 * constraint as a new booking: the old table holds are released and new ones taken in
 * one transaction, so a failed move leaves the original booking untouched.
 */
export async function moveBooking(db: PrismaClient, id: string, input: MoveInput, now = new Date()): Promise<MoveResult> {
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "NOT_FOUND", message: "Booking not found." };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
    return { ok: false, error: "NOT_EDITABLE", message: "This booking can no longer be edited." };
  }

  const ctx = await loadContext(db, input.date);
  if (!ctx) return { ok: false, error: "UNAVAILABLE", message: "Settings are missing." };
  const ruleError = checkRules(input, ctx, now, false);
  if (ruleError) return { ok: false, error: ruleError, message: "That time is outside opening hours." };

  const startsAt = toUtc(input.date, input.time, ctx.settings.timezone);
  const endsAt = new Date(startsAt.getTime() + durationFor(input.partySize, ctx.settings.durations) * 60_000);
  const { from, to } = dayBounds(input.date, ctx.settings.timezone);
  const busy = await loadBusy(db, from, to, id);
  const candidates = candidateAssignments(input.partySize, startsAt, endsAt, ctx.tables, ctx.combos, busy);

  for (const candidate of candidates) {
    try {
      await db.$transaction(async (tx) => {
        await tx.bookingTable.deleteMany({ where: { bookingId: id } });
        await tx.booking.update({ where: { id }, data: { startsAt, endsAt, partySize: input.partySize } });
        for (const tableId of candidate.tableIds) {
          await tx.$executeRaw`
            INSERT INTO "BookingTable" ("bookingId", "tableId", "during")
            VALUES (${id}, ${tableId}, tstzrange(${startsAt}::timestamptz, ${endsAt}::timestamptz, '[)'))`;
        }
      });
      return { ok: true };
    } catch (e) {
      if (isExclusionViolation(e)) continue;
      throw e;
    }
  }
  return { ok: false, error: "SLOT_TAKEN", message: "No table is free for that time and party size." };
}
