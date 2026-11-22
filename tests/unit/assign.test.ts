import { describe, expect, it } from "vitest";
import { candidateAssignments } from "@/lib/booking/assign";
import { computeAvailability, nearestTimes } from "@/lib/booking/availability";
import { DEFAULT_DURATIONS } from "@/lib/booking/slots";
import type { BusyRange, ComboInfo, RulesSettings, TableInfo, WeeklyPeriod } from "@/lib/booking/types";

const tables: TableInfo[] = [
  { id: "t2a", label: "T1", minSeats: 1, maxSeats: 2, active: true },
  { id: "t4a", label: "T2", minSeats: 2, maxSeats: 4, active: true },
  { id: "t4b", label: "T3", minSeats: 2, maxSeats: 4, active: true },
  { id: "t6a", label: "T4", minSeats: 4, maxSeats: 6, active: true },
  { id: "off", label: "T5", minSeats: 1, maxSeats: 2, active: false },
];
const combos: ComboInfo[] = [{ id: "c1", tableIds: ["t4a", "t4b"], minSeats: 5, maxSeats: 8 }];

const start = new Date("2026-06-04T18:00:00Z");
const end = new Date("2026-06-04T19:30:00Z");

describe("best-fit table assignment", () => {
  it("prefers the smallest table that fits", () => {
    expect(candidateAssignments(2, start, end, tables, combos, [])[0].tableIds).toEqual(["t2a"]);
    expect(candidateAssignments(3, start, end, tables, combos, [])[0].tableIds).toEqual(["t4a"]);
    expect(candidateAssignments(5, start, end, tables, combos, [])[0].tableIds).toEqual(["t6a"]);
  });

  it("never uses an inactive table", () => {
    const ids = candidateAssignments(1, start, end, tables, combos, []).flatMap((a) => a.tableIds);
    expect(ids).not.toContain("off");
  });

  it("falls back to the next size up, then to combinations", () => {
    const busy: BusyRange[] = [{ tableId: "t2a", start, end }];
    expect(candidateAssignments(2, start, end, tables, combos, busy)[0].tableIds).toEqual(["t4a"]);
    const busy6: BusyRange[] = [{ tableId: "t6a", start, end }];
    expect(candidateAssignments(6, start, end, tables, combos, busy6)[0].tableIds).toEqual(["t4a", "t4b"]);
    expect(candidateAssignments(6, start, end, tables, [], busy6)).toEqual([]);
    // 7 and 8 can only be seated by pushing tables together
    expect(candidateAssignments(8, start, end, tables, combos, [])[0].tableIds).toEqual(["t4a", "t4b"]);
  });

  it("a combo is blocked when either of its tables is busy", () => {
    const busy: BusyRange[] = [{ tableId: "t4b", start, end }];
    expect(candidateAssignments(8, start, end, tables, combos, busy)).toEqual([]);
  });

  it("treats back-to-back bookings as free (ranges are half-open)", () => {
    const busy: BusyRange[] = [{ tableId: "t2a", start: new Date("2026-06-04T16:30:00Z"), end: start }];
    expect(candidateAssignments(2, start, end, tables, combos, busy)[0].tableIds).toEqual(["t2a"]);
  });

  it("an overlapping booking blocks the table", () => {
    const busy: BusyRange[] = [{ tableId: "t2a", start: new Date("2026-06-04T19:00:00Z"), end: new Date("2026-06-04T20:30:00Z") }];
    expect(candidateAssignments(2, start, end, tables, combos, busy)[0].tableIds).toEqual(["t4a"]);
  });
});

describe("availability", () => {
  const settings: RulesSettings = {
    timezone: "Europe/London",
    slotIntervalMin: 15,
    maxPartyOnline: 8,
    bookingWindowDays: 30,
    minNoticeMin: 60,
    durations: DEFAULT_DURATIONS,
  };
  const weekly: WeeklyPeriod[] = [4].map((dayOfWeek) => ({ dayOfWeek, name: "Dinner", opensAt: "18:00", lastSeating: "20:00", closesAt: "22:00" }));
  const base = {
    date: "2026-06-04", // Thursday, BST so 18:00 local = 17:00Z
    now: new Date("2026-06-01T10:00:00Z"),
    settings,
    weekly,
    tables: [{ id: "only", label: "T1", minSeats: 1, maxSeats: 2, active: true }],
    combos: [],
  };

  it("marks a slot unavailable when the only table is held across it", () => {
    // hold 19:15Z-20:45Z = 20:15-21:45 local (BST)
    const busy: BusyRange[] = [{ tableId: "only", start: new Date("2026-06-04T19:15:00Z"), end: new Date("2026-06-04T20:45:00Z") }];
    const r = computeAvailability({ ...base, partySize: 2, busy });
    const slots = Object.fromEntries(r.periods[0].slots.map((s) => [s.time, s.available]));
    expect(slots["18:00"]).toBe(true);
    expect(slots["18:45"]).toBe(true); // ends exactly when the hold starts (half-open ranges)
    expect(slots["19:00"]).toBe(false);
    expect(slots["20:00"]).toBe(false);
  });

  it("reports closed days and unseatable parties", () => {
    expect(computeAvailability({ ...base, date: "2026-06-05", partySize: 2, busy: [] }).closed).toBe(true);
    const r = computeAvailability({ ...base, partySize: 4, busy: [] });
    expect(r.periods[0].slots.every((s) => !s.available)).toBe(true);
  });

  it("suggests the nearest free times", () => {
    const r = computeAvailability({ ...base, partySize: 2, busy: [] });
    expect(nearestTimes(r, "19:00", 2)).toEqual(["18:45", "19:15"]);
  });
});
