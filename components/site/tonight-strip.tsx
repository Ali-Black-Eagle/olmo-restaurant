"use client";

import { useEffect, useState } from "react";
import { useBooking } from "@/components/booking/booking-provider";
import type { AvailabilityResponse } from "@/components/booking/types";
import { BookButton } from "@/components/booking/book-button";
import { formatClock, todayIn } from "@/lib/time";

/** Next free times today for two. Tapping a time opens the booking sheet on the confirm step. */
export function TonightStrip() {
  const { open, config } = useBooking();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [times, setTimes] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!config.enabled) {
      setState("error");
      return;
    }
    const today = todayIn(config.timezone);
    setDate(today);
    const ctrl = new AbortController();
    fetch(`/api/availability?date=${today}&party=2`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AvailabilityResponse>) : Promise.reject()))
      .then((d) => {
        setClosed(d.closed);
        setTimes(d.periods.flatMap((p) => p.slots.filter((s) => s.available).map((s) => s.time)).slice(0, 6));
        setState("ready");
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setState("error");
      });
    return () => ctrl.abort();
  }, [config.enabled, config.timezone]);

  return (
    <section aria-labelledby="tonight-h" className="border-y border-olive/20">
      <div className="wrap flex flex-col gap-4 py-6 md:flex-row md:items-center md:gap-10">
        <h2 id="tonight-h" className="font-display text-[1.563rem] leading-tight md:min-w-[14ch]">
          Free today for two
        </h2>
        <div className="min-h-11 flex-1" aria-live="polite">
          {state === "loading" ? (
            <div className="flex gap-2" role="status" aria-label="Loading times">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton h-11 w-[84px]" />
              ))}
            </div>
          ) : state === "error" ? (
            <p className="text-olive-ink/80">Pick any day in the booking sheet to see free tables.</p>
          ) : closed ? (
            <p>We are closed today. Pick another day in the booking sheet.</p>
          ) : times.length === 0 ? (
            <p>Nothing left today for two. Other days have space.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {times.map((t) => (
                <li key={t}>
                  <button type="button" className="chip" onClick={() => open({ party: 2, date, time: t })}>
                    {formatClock(t)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <BookButton className="btn btn-secondary">Other days and sizes</BookButton>
      </div>
    </section>
  );
}
