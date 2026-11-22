"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BookingConfig, Prefill } from "./types";

// The sheet (vaul, motion and the booking flow) is kept out of the page load entirely.
const loadSheet = () => import("./booking-sheet");
const BookingSheet = dynamic(loadSheet, { ssr: false });

type Ctx = { open: (prefill?: Prefill) => void; isOpen: boolean; config: BookingConfig };
const BookingContext = createContext<Ctx | null>(null);

export function useBooking(): Ctx {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}

export function BookingProvider({ config, children }: { config: BookingConfig; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | undefined>();
  const [session, setSession] = useState(0);
  const [mounted, setMounted] = useState(false);
  const closeFn = useRef<(() => void) | null>(null);
  const pathname = usePathname();

  const open = useCallback((p?: Prefill) => {
    setPrefill(p);
    setSession((s) => s + 1);
    setMounted(true);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    closeFn.current?.();
    setOpen(false);
  }, []);

  const register = useCallback((fn: () => void) => {
    closeFn.current = fn;
  }, []);

  // Prefetch the sheet on intent (hover, focus or touch on anything that opens it), not on a
  // timer: it stays out of the page load entirely and is ready by the time the tap lands.
  useEffect(() => {
    const trigger = '[aria-haspopup="dialog"], [data-booking-trigger]';
    const onIntent = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(trigger)) {
        void loadSheet();
        events.forEach((t) => document.removeEventListener(t, onIntent, true));
      }
    };
    const events = ["pointerover", "focusin", "touchstart"] as const;
    events.forEach((t) => document.addEventListener(t, onIntent, { capture: true, passive: true }));
    return () => events.forEach((t) => document.removeEventListener(t, onIntent, true));
  }, []);

  // Navigating to another page closes the sheet.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const value = useMemo(() => ({ open, isOpen, config }), [open, isOpen, config]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {mounted ? (
        <BookingSheet
          isOpen={isOpen}
          session={session}
          config={config}
          prefill={prefill}
          onOpenChange={(o) => (o ? setOpen(true) : close())}
          onClose={close}
          registerCloseHandler={register}
        />
      ) : null}
    </BookingContext.Provider>
  );
}
