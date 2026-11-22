"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelBookingAdmin, createBookingAdmin, moveBookingAdmin, setBookingStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { formatClock, formatDateLong, timeOf } from "@/lib/time";
import type { DayBooking } from "@/lib/admin-data";
import { Notice, useRun } from "./use-run";

const STATUS_LABEL: Record<DayBooking["status"], string> = {
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

export function BookingsManager({ date, q, today, bookings }: { date: string; q: string; today: string; bookings: DayBooking[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DayBooking | "new" | null>(null);

  function applyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const qq = String(f.get("q") ?? "").trim();
    if (qq) params.set("q", qq);
    else params.set("date", String(f.get("date") || today));
    router.push(`/admin/bookings?${params.toString()}`);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[2.2rem]">Bookings</h1>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" size={18} /> Add booking
        </Button>
      </div>

      <form onSubmit={applyFilters} className="panel mb-6 flex flex-wrap items-end gap-4 p-4" role="search">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" name="date" type="date" className="input" defaultValue={date} disabled={Boolean(q) && false} />
        </div>
        <div className="field min-w-[220px] flex-1">
          <label htmlFor="q">Search name, email, phone or reference</label>
          <input id="q" name="q" type="search" className="input" defaultValue={q} placeholder="Priya, OLM-7K3F" />
        </div>
        <Button type="submit" size="sm">
          Show bookings
        </Button>
      </form>

      <p className="admin-muted mb-3" aria-live="polite">
        {q ? `${bookings.length} result${bookings.length === 1 ? "" : "s"} for "${q}"` : `${formatDateLong(date)}: ${bookings.length} booking${bookings.length === 1 ? "" : "s"}`}
      </p>

      {bookings.length === 0 ? (
        <p className="panel p-6">No bookings found. Use Add booking for a phone call or walk-in.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="admin-line border-b text-sm admin-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Time</th>
                <th scope="col" className="px-4 py-3 font-semibold">Guest</th>
                <th scope="col" className="px-4 py-3 font-semibold">Party</th>
                <th scope="col" className="px-4 py-3 font-semibold">Table</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="admin-line border-b last:border-b-0">
                  <td className="px-4 py-3 align-top">
                    <span className="font-semibold">{formatClock(timeOf(b.startMin))}</span>
                    {q ? <span className="admin-muted block text-sm">{formatDateLong(b.date)}</span> : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="font-semibold">{b.guestName}</span>
                    <span className="admin-muted block text-sm">{b.ref} ({b.source.toLowerCase()})</span>
                    <span className="admin-muted block text-sm">{b.email.endsWith("@no-email.invalid") ? "No email" : b.email}, {b.phone}</span>
                    {b.note ? <span className="block text-sm">Note: {b.note}</span> : null}
                  </td>
                  <td className="px-4 py-3 align-top">{b.partySize}</td>
                  <td className="px-4 py-3 align-top">{b.tableLabels.join(" + ") || "None"}</td>
                  <td className="px-4 py-3 align-top">
                    <span className="tag">{STATUS_LABEL[b.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(b)} disabled={b.status === "CANCELLED"}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog.Root open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[140] bg-char/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="admin fixed inset-y-0 right-0 z-[150] w-[min(100vw,480px)] overflow-y-auto border-l p-6 outline-none admin-line"
            style={{ minHeight: "auto" }}
          >
            {editing ? <BookingForm key={editing === "new" ? "new" : editing.id} booking={editing === "new" ? null : editing} date={date} today={today} onDone={() => setEditing(null)} /> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function BookingForm({ booking, date, today, onDone }: { booking: DayBooking | null; date: string; today: string; onDone: () => void }) {
  const { run, pending, feedback } = useRun();
  const [notify, setNotify] = useState(true);
  const isNew = booking === null;

  function values(form: HTMLFormElement) {
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? "");
    return { date: get("date"), time: get("time"), partySize: Number(get("partySize")), guestName: get("guestName"), email: get("email"), phone: get("phone"), note: get("note"), source: get("source") === "ADMIN" ? ("ADMIN" as const) : ("PHONE" as const) };
  }

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <Dialog.Title className="text-[1.8rem]">{isNew ? "Add booking" : booking.guestName}</Dialog.Title>
        <Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full" aria-label="Close">
          <X aria-hidden="true" size={22} />
        </Dialog.Close>
      </div>
      {!isNew ? (
        <p className="admin-muted mb-4 text-sm">
          {booking.ref}, {booking.email.endsWith("@no-email.invalid") ? "no email" : booking.email}, {booking.phone}
        </p>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const v = values(e.currentTarget);
          if (isNew) run(() => createBookingAdmin(v), (r) => r.ok && onDone());
          else run(() => moveBookingAdmin(booking.id, { date: v.date, time: v.time, partySize: v.partySize }), (r) => r.ok && onDone());
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="field">
            <label htmlFor="f-date">Date</label>
            <input id="f-date" name="date" type="date" required className="input" defaultValue={booking?.date ?? date ?? today} />
          </div>
          <div className="field">
            <label htmlFor="f-time">Time</label>
            <input id="f-time" name="time" type="time" required step={900} className="input" defaultValue={booking ? timeOf(booking.startMin) : "19:00"} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-party">Party size</label>
          <input id="f-party" name="partySize" type="number" min={1} max={40} required className="input" defaultValue={booking?.partySize ?? 2} inputMode="numeric" />
        </div>
        {isNew ? (
          <>
            <div className="field">
              <label htmlFor="f-name">Guest name</label>
              <input id="f-name" name="guestName" required className="input" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="f-email">Email (optional)</label>
              <input id="f-email" name="email" type="email" className="input" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="f-phone">Phone</label>
              <input id="f-phone" name="phone" type="tel" className="input" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="f-note">Note</label>
              <textarea id="f-note" name="note" className="input" maxLength={300} />
            </div>
            <div className="field">
              <label htmlFor="f-source">Source</label>
              <select id="f-source" name="source" className="input" defaultValue="PHONE">
                <option value="PHONE">Phone</option>
                <option value="ADMIN">Walk-in</option>
              </select>
            </div>
          </>
        ) : null}
        <p className="admin-muted text-sm">Staff bookings can use times inside the usual notice window. A table is assigned automatically and cannot clash with another booking.</p>
        <Notice feedback={feedback} />
        <Button type="submit" loading={pending}>
          {isNew ? "Add booking" : "Save changes"}
        </Button>
      </form>

      {!isNew ? (
        <div className="admin-line mt-8 grid gap-4 border-t pt-6">
          <h3 className="font-sans text-base font-semibold">Status</h3>
          <div className="flex flex-wrap gap-2">
            {(["CONFIRMED", "SEATED", "COMPLETED", "NO_SHOW"] as const).map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={booking.status === s} disabled={pending} onClick={() => run(() => setBookingStatus(booking.id, s), (r) => r.ok && onDone())}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <h3 className="mt-2 font-sans text-base font-semibold">Cancel booking</h3>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--saffron)]" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Email the guest a cancellation
          </label>
          <Button variant="danger" loading={pending} onClick={() => run(() => cancelBookingAdmin(booking.id, notify && !booking.email.endsWith("@no-email.invalid")), (r) => r.ok && onDone())}>
            Cancel this booking
          </Button>
        </div>
      ) : null}
    </>
  );
}
