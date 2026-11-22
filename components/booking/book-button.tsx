"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useBooking } from "./booking-provider";
import type { Prefill } from "./types";

/** Opens the booking sheet. On /book itself it is a plain link to the page. */
export function BookButton({
  children = "Book a table",
  className = "btn btn-primary",
  prefill,
}: {
  children?: ReactNode;
  className?: string;
  prefill?: Prefill;
}) {
  const { open } = useBooking();
  const pathname = usePathname();
  if (pathname === "/book") {
    return (
      <Link href="/book" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => open(prefill)} aria-haspopup="dialog">
      {children}
    </button>
  );
}
