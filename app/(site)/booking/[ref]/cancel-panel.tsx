"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cancelBookingAction } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";

type Props = { bookingRef: string; token: string; status: string; started: boolean; phone: string };

export function CancelPanel({ bookingRef, token, status, started, phone }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(status === "CANCELLED");
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div role="status">
        <p className="font-display text-3xl">Booking cancelled</p>
        <p className="mt-2">We have emailed you a confirmation.</p>
        <Link href="/book" className="btn btn-primary mt-5">
          Book another time
        </Link>
      </div>
    );
  }

  if (status !== "CONFIRMED" || started) {
    return (
      <p>
        This booking can no longer be cancelled online. Please call us on{" "}
        <a className="link" href={`tel:${phone.replace(/\s/g, "")}`}>
          {phone}
        </a>
        .
      </p>
    );
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await cancelBookingAction(bookingRef, token);
      if (res.ok) {
        setOpen(false);
        setDone(true);
      } else setError(res.message);
    } catch {
      setError("Something went wrong. Try again, or call us.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary btn-danger" onClick={() => setOpen(true)}>
        Cancel booking
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[140] bg-char/55" />
          <Dialog.Content
            aria-describedby="cancel-desc"
            className="fixed left-1/2 top-1/2 z-[150] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-ticket p-6 outline-none"
            style={{ boxShadow: "var(--lift)" }}
          >
            <Dialog.Title className="font-display text-3xl">Cancel this booking?</Dialog.Title>
            <Dialog.Description id="cancel-desc" className="mt-2">
              We will release your table and email you to confirm. This cannot be undone, but you can always book again.
            </Dialog.Description>
            {error ? (
              <p role="alert" className="error-text mt-4">
                <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="danger" loading={busy} onClick={cancel}>
                Yes, cancel booking
              </Button>
              <Dialog.Close className="btn btn-secondary">Keep my booking</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
