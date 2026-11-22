import type { BusyRange, ComboInfo, TableInfo } from "./types";

export type Assignment = { tableIds: string[]; seats: number };

function isFree(tableId: string, start: Date, end: Date, busy: BusyRange[]): boolean {
  return !busy.some((b) => b.tableId === tableId && b.start < end && b.end > start);
}

/**
 * Candidate table assignments for a party in best-fit order: single tables first
 * (smallest maxSeats that fits), then combinations (smallest maxSeats first).
 * Big tables stay free for big parties.
 */
export function candidateAssignments(
  partySize: number,
  start: Date,
  end: Date,
  tables: TableInfo[],
  combos: ComboInfo[],
  busy: BusyRange[],
): Assignment[] {
  const active = new Map(tables.filter((t) => t.active).map((t) => [t.id, t]));

  const singles = [...active.values()]
    .filter((t) => t.minSeats <= partySize && partySize <= t.maxSeats && isFree(t.id, start, end, busy))
    .sort((a, b) => a.maxSeats - b.maxSeats || a.label.localeCompare(b.label, "en", { numeric: true }))
    .map((t) => ({ tableIds: [t.id], seats: t.maxSeats }));

  const combined = combos
    .filter(
      (c) =>
        c.minSeats <= partySize &&
        partySize <= c.maxSeats &&
        c.tableIds.every((id) => active.has(id) && isFree(id, start, end, busy)),
    )
    .sort((a, b) => a.maxSeats - b.maxSeats || a.id.localeCompare(b.id))
    .map((c) => ({ tableIds: c.tableIds, seats: c.maxSeats }));

  return [...singles, ...combined];
}
