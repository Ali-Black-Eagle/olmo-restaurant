"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { BookingFlow } from "./booking-flow";
import type { BookingConfig, Prefill } from "./types";

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
  const closeFn = useRef<(() => void) | null>(null);
  const pathname = usePathname();

  const open = useCallback((p?: Prefill) => {
    setPrefill(p);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    closeFn.current?.();
    setOpen(false);
  }, []);

  const register = useCallback((fn: () => void) => {
    closeFn.current = fn;
  }, []);

  // Navigating to another page closes the sheet.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const value = useMemo(() => ({ open, isOpen, config }), [open, isOpen, config]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <Drawer.Root open={isOpen} onOpenChange={(o) => (o ? setOpen(true) : close())} repositionInputs={false}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[110] bg-char/55" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-[120] mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-[28px] bg-ticket outline-none"
            style={{ boxShadow: "var(--lift)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="relative h-14 shrink-0 border-b border-transparent pt-3">
              <div aria-hidden="true" className="mx-auto h-1.5 w-11 rounded-full bg-olive/40" />
              <Drawer.Title className="visually-hidden">Book a table at Olmo</Drawer.Title>
              <button
                type="button"
                onClick={close}
                aria-label="Close booking"
                className="absolute right-3 top-1 inline-flex size-11 items-center justify-center rounded-full hover:bg-olive-ink/6"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isOpen ? (
                <BookingFlow key={session} config={config} variant="sheet" prefill={prefill} onClose={close} registerCloseHandler={register} />
              ) : null}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </BookingContext.Provider>
  );
}
