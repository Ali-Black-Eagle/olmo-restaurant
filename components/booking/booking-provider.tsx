"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BookingConfig, Prefill } from "./types";

// The sheet (vaul, motion and the booking flow) is kept out of the first page load.
// It is prefetched a moment after the page has loaded, so the first tap still opens instantly.
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

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const warm = () => {
      timer = setTimeout(() => void loadSheet(), 2000);
    };
    if (document.readyState === "complete") warm();
    else window.addEventListener("load", warm, { once: true });
    return () => {
      window.removeEventListener("load", warm);
      if (timer) clearTimeout(timer);
    };
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
