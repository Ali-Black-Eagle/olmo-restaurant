import { describe, expect, it } from "vitest";
import { generateSlots, periodsForDate, durationFor, DEFAULT_DURATIONS } from "@/lib/booking/slots";
import { checkRules } from "@/lib/booking/rules";
import { toUtc, localDate, addDays, dayOfWeek, formatClock } from "@/lib/time";
import type { RulesSettings, WeeklyPeriod } from "@/lib/booking/types";

const settings: RulesSettings = {
  timezone: "Europe/London",
  slotIntervalMin: 15,
  maxPartyOnline: 8,
  bookingWindowDays: 30,
  minNoticeMin: 60,
  durations: DEFAULT_DURATIONS,
};

const weekly: WeeklyPeriod[] = [2, 3, 4, 5, 6, 0].flatMap((dayOfWeek) => [
  { dayOfWeek, name: "Lunch", opensAt: "12:00", lastSeating: "14:30", closesAt: "16:00" },
  { dayOfWeek, name: "Dinner", opensAt: "17:30", lastSeating: "21:00", closesAt: "23:00" },
]);

const longAgo = new Date("2026-01-01T00:00:00Z");

describe("time helpers", () => {
  it("converts restaurant-local time to UTC across the spring DST change", () => {
    // UK clocks go forward on Sunday 29 March 2026 at 01:00 UTC
    expect(toUtc("2026-03-28", "12:00", "Europe/London").toISOString()).toBe("2026-03-28T12:00:00.000Z");
    expect(toUtc("2026-03-29", "12:00", "Europe/London").toISOString()).toBe("2026-03-29T11:00:00.000Z");
  });

  it("converts across the autumn DST change", () => {
    // Clocks go back on Sunday 25 October 2026
    expect(toUtc("2026-10-24", "19:00", "Europe/London").toISOString()).toBe("2026-10-24T18:00:00.000Z");
    expect(toUtc("2026-10-25", "19:00", "Europe/London").toISOString()).toBe("2026-10-25T19:00:00.000Z");
  });

  it("reads the local calendar date of an instant", () => {
    expect(localDate(new Date("2026-07-01T23:30:00Z"), "Europe/London")).toBe("2026-07-02");
    expect(localDate(new Date("2026-01-01T23:30:00Z"), "Europe/London")).toBe("2026-01-01");
  });

  it("does date maths and weekdays without timezone drift", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(dayOfWeek("2026-03-29")).toBe(0);
    expect(formatClock("19:30")).toBe("7:30 pm");
    expect(formatClock("12:00")).toBe("12 pm");
  });
});

describe("slot generation", () => {
  it("lists every 15 minutes from opening to last seating", () => {
    const periods = periodsForDate("2026-06-04", weekly); // a Thursday
    const groups = generateSlots("2026-06-04", periods, settings, longAgo);
    expect(groups.map((g) => g.name)).toEqual(["Lunch", "Dinner"]);
    expect(groups[0].slots.map((s) => s.time)).toEqual(["12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30"]);
    expect(groups[1].slots.at(-1)?.time).toBe("21:00");
    expect(groups[1].slots).toHaveLength(15);
  });

  it("has no slots on a closed weekday (Monday)", () => {
    expect(periodsForDate("2026-06-01", weekly)).toEqual([]);
  });

  it("produces the right UTC instants on the day the clocks change", () => {
    const groups = generateSlots("2026-03-29", periodsForDate("2026-03-29", weekly), settings, longAgo);
    expect(groups[0].slots[0].startsAt.toISOString()).toBe("2026-03-29T11:00:00.000Z"); // 12:00 BST
    const autumn = generateSlots("2026-10-25", periodsForDate("2026-10-25", weekly), settings, longAgo);
    expect(autumn[0].slots[0].startsAt.toISOString()).toBe("2026-10-25T12:00:00.000Z"); // 12:00 GMT
  });

  it("drops slots inside the minimum notice window", () => {
    const now = new Date("2026-06-04T11:00:00Z"); // 12:00 BST
    const groups = generateSlots("2026-06-04", periodsForDate("2026-06-04", weekly), settings, now);
    // lunch needs to be 13:00 or later; everything from 13:00 to 14:30 survives
    expect(groups[0].slots[0].time).toBe("13:00");
  });

  it("removes a period entirely when all its slots are past", () => {
    const now = new Date("2026-06-04T14:00:00Z"); // 15:00 BST
    const groups = generateSlots("2026-06-04", periodsForDate("2026-06-04", weekly), settings, now);
    expect(groups.map((g) => g.name)).toEqual(["Dinner"]);
  });

  it("special days: closed overrides the week, custom periods replace it", () => {
    expect(periodsForDate("2026-06-04", weekly, { closed: true })).toEqual([]);
    const custom = [{ name: "Dinner", opensAt: "18:00", lastSeating: "20:00", closesAt: "22:00" }];
    expect(periodsForDate("2026-06-04", weekly, { closed: false, periods: custom })).toEqual(custom);
    // a special day with no override periods keeps the weekly pattern
    expect(periodsForDate("2026-06-04", weekly, { closed: false, note: "Private hire in the back room" })).toHaveLength(2);
    // and a special day can open a normally closed Monday
    expect(periodsForDate("2026-06-01", weekly, { closed: false, periods: custom })).toEqual(custom);
  });
});

describe("durations", () => {
  it("scales with party size", () => {
    expect(durationFor(1, DEFAULT_DURATIONS)).toBe(90);
    expect(durationFor(2, DEFAULT_DURATIONS)).toBe(90);
    expect(durationFor(3, DEFAULT_DURATIONS)).toBe(105);
    expect(durationFor(6, DEFAULT_DURATIONS)).toBe(120);
    expect(durationFor(8, DEFAULT_DURATIONS)).toBe(150);
    expect(durationFor(12, DEFAULT_DURATIONS)).toBe(150);
  });
});

describe("booking rules", () => {
  const now = new Date("2026-06-01T10:00:00Z");
  const ctx = { settings, weekly };

  it("accepts a normal slot", () => {
    expect(checkRules({ date: "2026-06-04", time: "19:30", partySize: 2 }, ctx, now)).toBeNull();
  });
  it("rejects a closed day, too-large party, window and off-grid times", () => {
    expect(checkRules({ date: "2026-06-08", time: "19:30", partySize: 2 }, ctx, now)).toBe("CLOSED");
    expect(checkRules({ date: "2026-06-04", time: "19:30", partySize: 9 }, ctx, now)).toBe("PARTY_TOO_LARGE");
    expect(checkRules({ date: "2026-08-04", time: "19:30", partySize: 2 }, ctx, now)).toBe("OUTSIDE_WINDOW");
    expect(checkRules({ date: "2026-06-04", time: "19:20", partySize: 2 }, ctx, now)).toBe("NOT_OFFERED");
    expect(checkRules({ date: "2026-06-04", time: "03:00", partySize: 2 }, ctx, now)).toBe("NOT_OFFERED");
    expect(checkRules({ date: "nope", time: "19:30", partySize: 2 }, ctx, now)).toBe("INVALID");
  });
  it("rejects slots inside the notice window but lets staff through", () => {
    const soon = new Date("2026-06-04T17:45:00Z"); // 18:45 BST
    expect(checkRules({ date: "2026-06-04", time: "19:00", partySize: 2 }, ctx, soon)).toBe("TOO_SOON");
    expect(checkRules({ date: "2026-06-04", time: "19:00", partySize: 2 }, ctx, soon, false)).toBeNull();
  });
});
