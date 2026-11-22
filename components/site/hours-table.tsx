"use client";

import { useEffect, useState } from "react";
import type { HoursRow, SpecialDayView } from "@/lib/data";
import { dayOfWeek, formatClock, formatDateLong, todayIn } from "@/lib/time";

/** Weekly hours with today highlighted. Today is computed in the browser so cached pages never show a stale day. */
export function HoursTable({ rows, timezone, special }: { rows: HoursRow[]; timezone: string; special: SpecialDayView[] }) {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(dayOfWeek(todayIn(timezone))), [timezone]);

  return (
    <div>
      <table className="w-full border-collapse text-left">
        <caption className="visually-hidden">Opening hours</caption>
        <thead className="visually-hidden">
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isToday = today === r.dayOfWeek;
            return (
              <tr key={r.label} className="border-b border-olive/20" aria-current={isToday ? "date" : undefined}>
                <th scope="row" className="py-3 pr-4 align-top font-semibold">
                  <span className="inline-flex items-center gap-2">
                    {isToday ? <span aria-hidden="true" className="size-2 rounded-full bg-saffron" /> : null}
                    {r.label}
                    {isToday ? <span className="tag ml-1">Today</span> : null}
                  </span>
                </th>
                <td className="py-3 align-top">
                  {r.periods.length === 0 ? (
                    <span className="text-olive">Closed</span>
                  ) : (
                    r.periods.map((p) => (
                      <div key={p.name}>
                        {p.name} {formatClock(p.opensAt)} to {formatClock(p.closesAt)}
                        <span className="block text-sm text-olive">Last booking {formatClock(p.lastSeating)}</span>
                      </div>
                    ))
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {special.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-sans text-base font-semibold tracking-normal">Coming up</h3>
          <ul className="mt-2 grid gap-1 text-[16px]">
            {special.map((d) => (
              <li key={d.date}>
                <strong>{formatDateLong(d.date)}:</strong>{" "}
                {d.closed
                  ? "closed"
                  : d.periods?.length
                    ? d.periods.map((p) => `${p.name} ${formatClock(p.opensAt)} to ${formatClock(p.closesAt)}`).join(", ")
                    : "open as usual"}
                {d.note ? `. ${d.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
