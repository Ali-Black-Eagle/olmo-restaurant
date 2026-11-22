"use client";

import { X } from "lucide-react";
import { Drawer } from "vaul";
import { BookingFlow } from "./booking-flow";
import type { BookingConfig, Prefill } from "./types";

type Props = {
  isOpen: boolean;
  session: number;
  config: BookingConfig;
  prefill?: Prefill;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  registerCloseHandler: (fn: () => void) => void;
};

/** The bottom sheet and the booking flow. Loaded on demand by BookingProvider. */
export default function BookingSheet({ isOpen, session, config, prefill, onOpenChange, onClose, registerCloseHandler }: Props) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange} repositionInputs={false}>
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
              onClick={onClose}
              aria-label="Close booking"
              className="absolute right-3 top-1 inline-flex size-11 items-center justify-center rounded-full hover:bg-olive-ink/6"
            >
              <X aria-hidden="true" size={22} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isOpen ? (
              <BookingFlow key={session} config={config} variant="sheet" prefill={prefill} onClose={onClose} registerCloseHandler={registerCloseHandler} />
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
