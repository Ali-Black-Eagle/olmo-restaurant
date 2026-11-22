import type { BookingSource, PrismaClient } from "@/generated/prisma/client";
import { computeAvailability, nearestTimes } from "./availability";
import { candidateAssignments } from "./assign";
import { dayBounds, loadBusy, loadContext } from "./data";
import { checkRules, RULE_MESSAGES } from "./rules";
import { durationFor } from "./slots";
import { generateRef, generateToken, hashToken } from "./tokens";
import type { BookingErrorCode } from "./types";
import { toUtc } from "@/lib/time";

export type CreateInput = {
  date: string;
  time: string;
  partySize: number;
  guestName: string;
  email: string;
  phone: string;
  note?: string | null;
  source?: BookingSource;
  /** Staff bookings (phone/admin) skip online notice, window and party limits. */
  online?: boolean;
};

export type CreatedBooking = {
  id: string;
  ref: string;
  startsAt: Date;
  endsAt: Date;
  partySize: number;
  guestName: string;
  email: string;
  phone: string;
  note: string | null;
  tableLabels: string[];
};

export type CreateResult =
  | { ok: true; booking: CreatedBooking; token: string }
  | { ok: false; error: BookingErrorCode; message: string; alternatives?: string[] };

/** True when Postgres rejected the insert because the exclusion constraint fired (SQLSTATE 23P01). */
export function isExclusionViolation(e: unknown, depth = 0): boolean {
  if (!e || typeof e !== "object" || depth > 5) return false;
  const err = e as { code?: unknown; message?: unknown; cause?: unknown; meta?: unknown; originalCode?: unknown };
  if (err.code === "23P01" || err.originalCode === "23P01") return true;
  const text = `${String(err.message ?? "")} ${JSON.stringify(err.meta ?? {})}`;
  if (/23P01|no_overlap|exclusion constraint/i.test(text)) return true;
  return isExclusionViolation(err.cause, depth + 1);
}

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  return err?.code === "P2002" || /unique constraint|23505/i.test(String(err?.message ?? ""));
}

const fail = (error: BookingErrorCode, alternatives?: string[]): CreateResult => ({
  ok: false,
  error,
  message: RULE_MESSAGES[error] ?? "That time is no longer available.",
  alternatives,
});

/**
 * The booking transaction. Framework-free so it can be unit tested against a real database.
 * Concurrency is settled by the database: candidates are tried best-fit first and a
 * 23P01 (someone else holds the table) just moves on to the next candidate.
 */
export async function createBookingCore(db: PrismaClient, input: CreateInput, now = new Date()): Promise<CreateResult> {
  const online = input.online ?? (input.source ?? "WEB") === "WEB";
  const ctx = await loadContext(db, input.date);
  if (!ctx) return fail("UNAVAILABLE");

  const ruleError = checkRules(input, ctx, now, online);
  if (ruleError) return fail(ruleError);

  const { timezone } = ctx.settings;
  const startsAt = toUtc(input.date, input.time, timezone);
  const endsAt = new Date(startsAt.getTime() + durationFor(input.partySize, ctx.settings.durations) * 60_000);

  const email = input.email.trim().toLowerCase();
  const duplicate = await db.booking.findFirst({
    where: { email, startsAt, status: { in: ["CONFIRMED", "SEATED"] } },
    select: { id: true },
  });
  if (duplicate) return fail("ALREADY_BOOKED");

  const { from, to } = dayBounds(input.date, timezone);
  const busy = await loadBusy(db, from, to);
  const candidates = candidateAssignments(input.partySize, startsAt, endsAt, ctx.tables, ctx.combos, busy);

  const token = generateToken();
  const cancelTokenHash = hashToken(token);

  for (const candidate of candidates) {
    for (let refAttempt = 0; refAttempt < 5; refAttempt++) {
      const ref = generateRef();
      try {
        const booking = await db.$transaction(async (tx) => {
          const created = await tx.booking.create({
            data: {
              ref,
              startsAt,
              endsAt,
              partySize: input.partySize,
              guestName: input.guestName.trim(),
              email,
              phone: input.phone.trim(),
              note: input.note?.trim() || null,
              source: input.source ?? "WEB",
              cancelTokenHash,
            },
          });
          for (const tableId of candidate.tableIds) {
            await tx.$executeRaw`
              INSERT INTO "BookingTable" ("bookingId", "tableId", "during")
              VALUES (${created.id}, ${tableId}, tstzrange(${startsAt}::timestamptz, ${endsAt}::timestamptz, '[)'))`;
          }
          return created;
        });
        const labels = ctx.tables.filter((t) => candidate.tableIds.includes(t.id)).map((t) => t.label);
        return {
          ok: true,
          token,
          booking: {
            id: booking.id,
            ref: booking.ref,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            partySize: booking.partySize,
            guestName: booking.guestName,
            email: booking.email,
            phone: booking.phone,
            note: booking.note,
            tableLabels: labels,
          },
        };
      } catch (e) {
        if (isExclusionViolation(e)) break; // someone grabbed this table first: next candidate
        if (isUniqueViolation(e)) continue; // ref collision: new ref
        throw e;
      }
    }
  }

  // Nothing left: offer the nearest times that still work.
  const fresh = await loadBusy(db, from, to);
  const availability = computeAvailability({
    date: input.date,
    partySize: input.partySize,
    now,
    settings: ctx.settings,
    weekly: ctx.weekly,
    special: ctx.special,
    tables: ctx.tables,
    combos: ctx.combos,
    busy: fresh,
  });
  return fail("SLOT_TAKEN", nearestTimes(availability, input.time));
}
