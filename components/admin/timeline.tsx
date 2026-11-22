"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { setBookingStatus } from "@/app/actions/admin";
import { formatClock, timeOf } from "@/lib/time";
import type { DayBooking } from "@/lib/admin-data";
import { Notice, useRun } from "./use-run";

export type TimelineTable = { id: string; label: string; maxSeats: number; zone: string | null };
type Period = { name: string; opensAt: string; lastSeating: string; closesAt: string };

const STATUS_STYLE: Record<DayBooking["status"], { bg: string; fg: string; label: string }> = {
  CONFIRMED: { bg: "color-mix(in srgb, var(--saffron) 85%, transparent)", fg: "#26301f", label: "Confirmed" },
  SEATED: { bg: "#5c6b3c", fg: "#fbf8f1", label: "Seated" },
  COMPLETED: { bg: "color-mix(in srgb, var(--olive) 30%, transparent)", fg: "var(--a-text)", label: "Completed" },
  NO_SHOW: { bg: "#8a2e3b", fg: "#fbf8f1", label: "No-show" },
  CANCELLED: { bg: "transparent", fg: "var(--a-muted)", label: "Cancelled" },
};

const TICK = 15;

export function TodayBoard({
  date,
  tables,
  bookings,
  periods,
  nowMin,
}: {
  date: string;
  tables: TimelineTable[];
  bookings: DayBooking[];
  periods: Period[];
  /** Minutes since midnight in the restaurant, or null when viewing another day. */
  nowMin: number | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { run, pending, feedback } = useRun();

  // New bookings arrive while staff are looking at the screen: poll quietly.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const live = bookings.filter((b) => b.status !== "CANCELLED");
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const startMin = periods.length ? Math.floor(Math.min(...periods.map((p) => toMin(p.opensAt))) / 60) * 60 : 12 * 60;
  const endMin = Math.max(
    periods.length ? Math.ceil(Math.max(...periods.map((p) => toMin(p.closesAt))) / 60) * 60 : 23 * 60,
    ...live.map((b) => Math.ceil(b.endMin / 60) * 60),
  );
  const cols = Math.max(1, Math.round((endMin - startMin) / TICK));
  const hourMarks = Array.from({ length: Math.floor((endMin - startMin) / 60) + 1 }, (_, i) => startMin + i * 60);

  const covers = periods.map((p) => {
    const from = toMin(p.opensAt);
    const to = toMin(p.closesAt);
    const inPeriod = live.filter((b) => b.startMin >= from && b.startMin < to);
    return { name: p.name, covers: inPeriod.reduce((n, b) => n + b.partySize, 0), bookings: inPeriod.length };
  });

  const arrivals = live
    .filter((b) => b.status === "CONFIRMED" || b.status === "SEATED")
    .filter((b) => nowMin === null || b.endMin > nowMin)
    .sort((a, b) => a.startMin - b.startMin);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-3">
        {covers.length === 0 ? (
          <p className="admin-muted">Closed on this day.</p>
        ) : (
          covers.map((c) => (
            <div key={c.name} className="panel px-5 py-3">
              <p className="admin-muted text-sm">{c.name}</p>
              <p className="font-display text-3xl leading-tight">
                {c.covers} <span className="font-sans text-base">covers</span>
              </p>
              <p className="admin-muted text-sm">
                {c.bookings} {c.bookings === 1 ? "booking" : "bookings"}
              </p>
            </div>
          ))
        )}
      </div>

      <section aria-label="Service timeline">
        <h2 className="mb-3 text-2xl">Timeline</h2>
        <div className="panel overflow-x-auto">
          <div style={{ minWidth: 720 }}>
            <div className="grid" style={{ gridTemplateColumns: `72px repeat(${cols}, minmax(0, 1fr))` }}>
              <div />
              {hourMarks.slice(0, -1).map((m) => (
                <div
                  key={m}
                  className="admin-line border-l py-2 pl-1 text-xs admin-muted"
                  style={{ gridColumn: `${(m - startMin) / TICK + 2} / span ${60 / TICK}` }}
                >
                  {formatClock(timeOf(m))}
                </div>
              ))}
            </div>
            {tables.map((t) => (
              <div key={t.id} className="admin-line relative grid items-stretch border-t" style={{ gridTemplateColumns: `72px repeat(${cols}, minmax(0, 1fr))`, minHeight: 44 }}>
                <div className="flex flex-col justify-center px-3 text-sm font-semibold leading-tight">
                  {t.label}
                  <span className="admin-muted text-xs font-normal">{t.maxSeats} seats</span>
                </div>
                {hourMarks.slice(0, -1).map((m) => (
                  <div key={m} aria-hidden="true" className="admin-line border-l" style={{ gridColumn: `${(m - startMin) / TICK + 2} / span ${60 / TICK}`, gridRow: 1 }} />
                ))}
                {nowMin !== null && nowMin >= startMin && nowMin <= endMin ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none"
                    style={{ gridRow: 1, gridColumn: `${Math.floor((nowMin - startMin) / TICK) + 2}`, borderLeft: "2px solid var(--beet)", marginLeft: `${(((nowMin - startMin) % TICK) / TICK) * 100}%` }}
                  />
                ) : null}
                {live
                  .filter((b) => b.tableIds.includes(t.id))
                  .map((b) => {
                    const s = STATUS_STYLE[b.status];
                    const from = Math.max(0, Math.round((b.startMin - startMin) / TICK));
                    const span = Math.max(1, Math.round((b.endMin - b.startMin) / TICK));
                    return (
                      <motion.div
                        key={b.id + t.id}
                        layout
                        initial={reduce ? false : { opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0, backgroundColor: s.bg, color: s.fg }}
                        transition={{ duration: reduce ? 0.01 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                        className="z-[1] m-0.5 overflow-hidden rounded-[10px] px-2 py-1 text-xs leading-tight"
                        style={{ gridColumn: `${from + 2} / span ${span}`, gridRow: 1 }}
                        title={`${b.guestName}, party of ${b.partySize}, ${b.ref} (${s.label})`}
                      >
                        <span className="block truncate font-semibold">
                          {b.guestName} ({b.partySize})
                        </span>
                        <span className="block truncate opacity-80">
                          {b.tableLabels.length > 1 ? b.tableLabels.join(" + ") : s.label}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-4 text-sm">
          {(["CONFIRMED", "SEATED", "COMPLETED", "NO_SHOW"] as const).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block size-3 rounded-full" style={{ background: STATUS_STYLE[k].bg }} />
              {STATUS_STYLE[k].label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Next arrivals">
        <h2 className="mb-3 text-2xl">{nowMin === null ? "Bookings" : "Next arrivals"}</h2>
        <Notice feedback={feedback} />
        {arrivals.length === 0 ? (
          <p className="admin-muted">No more arrivals{nowMin === null ? "" : " today"}.</p>
        ) : (
          <ul className="grid gap-2">
            {arrivals.map((b) => (
              <li key={b.id} className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <p className="w-20 font-display text-2xl">{formatClock(timeOf(b.startMin))}</p>
                <div className="min-w-[160px] flex-1">
                  <p className="font-semibold">
                    {b.guestName} <span className="admin-muted font-normal">party of {b.partySize}</span>
                  </p>
                  <p className="admin-muted text-sm">
                    {b.tableLabels.join(" + ") || "No table"} · {b.ref}
                    {b.note ? ` · ${b.note}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Status for ${b.guestName}`}>
                  <button type="button" className="chip" aria-pressed={b.status === "SEATED"} disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "SEATED"))}>
                    Seated
                  </button>
                  <button type="button" className="chip" disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "COMPLETED"))}>
                    Completed
                  </button>
                  <button type="button" className="chip" disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "NO_SHOW"))}>
                    No-show
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="visually-hidden">Showing bookings for {date}</p>
    </div>
  );
}
