"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookButton } from "@/components/booking/book-button";
import { useBooking } from "@/components/booking/booking-provider";

/** Mobile-only bottom bar. Hidden while the sheet is open, when the footer is on screen and on /book. */
export function StickyBookBar() {
  const { isOpen } = useBooking();
  const pathname = usePathname();
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname]);

  const hidden = isOpen || footerVisible || pathname === "/book";
  return (
    <div
      aria-hidden={hidden}
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-olive/15 bg-linen px-4 pt-3 md:hidden"
      style={{
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        transform: hidden ? "translateY(110%)" : "translateY(0)",
        transition: "transform 200ms var(--ease-out)",
        visibility: hidden ? "hidden" : "visible",
      }}
    >
      <BookButton className="btn btn-primary w-full" />
    </div>
  );
}
