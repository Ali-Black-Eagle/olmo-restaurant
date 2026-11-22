import { addDays, isDateString, isTimeString, localDate, toUtc } from "@/lib/time";
import { generateSlots, periodsForDate } from "./slots";
import type { BookingErrorCode, RulesSettings, SpecialDayInfo, WeeklyPeriod } from "./types";

export type RuleInput = { date: string; time: string; partySize: number };

export const RULE_MESSAGES: Record<string, string> = {
  INVALID: "Check the date, time and party size and try again.",
  CLOSED: "We are closed that day.",
  TOO_SOON: "That time is too soon to book online. Call us and we will do our best.",
  OUTSIDE_WINDOW: "We take bookings up to 30 days ahead.",
  PARTY_TOO_LARGE: "For larger parties, please call us.",
  NOT_OFFERED: "We do not seat guests at that time.",
};

/**
 * Server-side rules for online bookings. Returns an error code, or null when the
 * request is acceptable. `online: false` (staff booking) skips notice, window and party limits.
 */
export function checkRules(
  input: RuleInput,
  ctx: { settings: RulesSettings; weekly: WeeklyPeriod[]; special?: SpecialDayInfo | null },
  now: Date,
  online = true,
): BookingErrorCode | null {
  const { settings } = ctx;
  if (!isDateString(input.date) || !isTimeString(input.time)) return "INVALID";
  if (!Number.isInteger(input.partySize) || input.partySize < 1) return "INVALID";
  if (online && input.partySize > settings.maxPartyOnline) return "PARTY_TOO_LARGE";

  const today = localDate(now, settings.timezone);
  if (input.date < today) return "TOO_SOON";
  if (online && input.date > addDays(today, settings.bookingWindowDays)) return "OUTSIDE_WINDOW";

  const periods = periodsForDate(input.date, ctx.weekly, ctx.special);
  if (periods.length === 0) return "CLOSED";

  // Staff may book inside the notice window; online guests may not.
  const effective = { ...settings, minNoticeMin: online ? settings.minNoticeMin : -24 * 60 };
  const slots = generateSlots(input.date, periods, effective, now).flatMap((g) => g.slots);
  if (slots.some((s) => s.time === input.time)) return null;

  // Not offered: distinguish "too soon" from "not on the grid".
  const all = generateSlots(input.date, periods, { ...settings, minNoticeMin: -24 * 60 }, now).flatMap((g) => g.slots);
  const target = toUtc(input.date, input.time, settings.timezone);
  if (all.some((s) => s.time === input.time) && target.getTime() < now.getTime() + settings.minNoticeMin * 60_000) {
    return "TOO_SOON";
  }
  return "NOT_OFFERED";
}
