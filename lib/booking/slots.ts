import { dayOfWeek, minutesOf, timeOf, toUtc } from "@/lib/time";
import type { DurationRule, Period, RulesSettings, SlotGroup, SpecialDayInfo, WeeklyPeriod } from "./types";

/** A special day overrides the weekly pattern; a closed special day has no periods. */
export function periodsForDate(date: string, weekly: WeeklyPeriod[], special?: SpecialDayInfo | null): Period[] {
  if (special) {
    if (special.closed) return [];
    if (special.periods && special.periods.length > 0) return special.periods;
  }
  const dow = dayOfWeek(date);
  return weekly
    .filter((p) => p.dayOfWeek === dow)
    .sort((a, b) => minutesOf(a.opensAt) - minutesOf(b.opensAt))
    .map(({ name, opensAt, lastSeating, closesAt }) => ({ name, opensAt, lastSeating, closesAt }));
}

/**
 * Every grid time from opensAt to lastSeating (inclusive), converted to UTC in the
 * restaurant timezone, dropping anything inside the minimum notice window.
 */
export function generateSlots(
  date: string,
  periods: Period[],
  s: Pick<RulesSettings, "timezone" | "slotIntervalMin" | "minNoticeMin">,
  now: Date,
): SlotGroup[] {
  const earliest = now.getTime() + s.minNoticeMin * 60_000;
  return periods
    .map((p) => {
      const slots = [];
      for (let m = minutesOf(p.opensAt); m <= minutesOf(p.lastSeating); m += s.slotIntervalMin) {
        const time = timeOf(m);
        const startsAt = toUtc(date, time, s.timezone);
        if (startsAt.getTime() >= earliest) slots.push({ time, startsAt });
      }
      return { name: p.name, slots };
    })
    .filter((g) => g.slots.length > 0);
}

export function durationFor(partySize: number, rules: DurationRule[]): number {
  const sorted = [...rules].sort((a, b) => a.maxParty - b.maxParty);
  return (sorted.find((r) => partySize <= r.maxParty) ?? sorted[sorted.length - 1]).minutes;
}

export const DEFAULT_DURATIONS: DurationRule[] = [
  { maxParty: 2, minutes: 90 },
  { maxParty: 4, minutes: 105 },
  { maxParty: 6, minutes: 120 },
  { maxParty: 8, minutes: 150 },
];
