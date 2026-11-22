"use client";

import { motion, useReducedMotion } from "motion/react";

export type TicketData = {
  bookingRef: string;
  guestName: string;
  partySize: number;
  dateLabel: string;
  timeLabel: string;
  address: string;
  /** e.g. "Cancelled" */
  stamp?: string;
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <dt className="text-[15px] text-olive">{label}</dt>
      <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-olive/50" />
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

/**
 * A kitchen order ticket. With `print`, it feeds down out of a slot (clip-path reveal,
 * a degree of tilt settling to flat). Reduced motion gets a plain fade.
 */
export function Ticket({ data, print = false }: { data: TicketData; print?: boolean }) {
  const reduce = useReducedMotion();
  const animate = print && !reduce;

  return (
    <div className="mx-auto w-full max-w-[400px]">
      {print && <div aria-hidden="true" className="relative z-10 mx-auto h-3 w-[92%] rounded-full bg-char" />}
      <motion.div
        initial={print ? (reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)", y: -28, rotate: 1 }) : false}
        animate={animate ? { clipPath: "inset(0 0 0% 0)", y: 0, rotate: 0 } : { opacity: 1 }}
        transition={animate ? { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] } : { duration: 0.2 }}
        style={{ filter: "drop-shadow(0 8px 10px rgba(38,48,31,0.16))", marginTop: print ? -6 : 0, transformOrigin: "top center" }}
      >
        <article className="ticket px-6 pb-9 pt-6" aria-label={`Booking ${data.bookingRef}`}>
          <div className="flex items-start justify-between gap-4">
            <p className="font-display text-[26px] leading-none">Olmo</p>
            {data.stamp ? (
              <p className="rounded-sm border-2 border-beet px-2 py-0.5 text-sm font-bold text-beet">{data.stamp}</p>
            ) : (
              <p className="text-sm text-olive">Order for {data.guestName.split(" ")[0]}</p>
            )}
          </div>
          <h2 className="mt-5 font-display text-4xl">Table for {data.partySize}</h2>
          <dl className="mt-4 border-t border-dashed border-olive/50 pt-3">
            <Line label="Booking" value={data.bookingRef} />
            <Line label="Date" value={data.dateLabel} />
            <Line label="Time" value={data.timeLabel} />
            <Line label="Party" value={`${data.partySize} ${data.partySize === 1 ? "guest" : "guests"}`} />
            <Line label="Where" value={data.address} />
          </dl>
        </article>
      </motion.div>
    </div>
  );
}
