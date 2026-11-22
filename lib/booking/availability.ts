import { candidateAssignments } from "./assign";
import { durationFor, generateSlots, periodsForDate } from "./slots";
import type {
  AvailabilityResult,
  BusyRange,
  ComboInfo,
  RulesSettings,
  SpecialDayInfo,
  TableInfo,
  WeeklyPeriod,
} from "./types";

export type AvailabilityInput = {
  date: string;
  partySize: number;
  now: Date;
  settings: RulesSettings;
  weekly: WeeklyPeriod[];
  special?: SpecialDayInfo | null;
  tables: TableInfo[];
  combos: ComboInfo[];
  busy: BusyRange[];
};

/** Pure: which slots on a day can seat this party? */
export function computeAvailability(i: AvailabilityInput): AvailabilityResult {
  const periods = periodsForDate(i.date, i.weekly, i.special);
  const duration = durationFor(i.partySize, i.settings.durations);
  const groups = generateSlots(i.date, periods, i.settings, i.now);

  return {
    date: i.date,
    closed: periods.length === 0,
    note: i.special?.note ?? null,
    periods: groups.map((g) => ({
      name: g.name,
      slots: g.slots.map((s) => {
        const end = new Date(s.startsAt.getTime() + duration * 60_000);
        const free = candidateAssignments(i.partySize, s.startsAt, end, i.tables, i.combos, i.busy).length > 0;
        return { time: s.time, available: free };
      }),
    })),
  };
}

/** Nearest available times to `time` on the same day, closest first, returned in clock order. */
export function nearestTimes(result: AvailabilityResult, time: string, limit = 4): string[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const target = toMin(time);
  return result.periods
    .flatMap((p) => p.slots.filter((s) => s.available).map((s) => s.time))
    .filter((t) => t !== time)
    .sort((a, b) => Math.abs(toMin(a) - target) - Math.abs(toMin(b) - target))
    .slice(0, limit)
    .sort();
}
