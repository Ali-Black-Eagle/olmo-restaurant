"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookButton } from "@/components/booking/book-button";
import { TransitionLink } from "./transition-link";

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/visit", label: "Visit" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[90] border-b transition-colors duration-200"
        style={{
          height: "var(--header-h)",
          background: scrolled ? "var(--linen)" : "transparent",
          borderColor: scrolled ? "color-mix(in srgb, var(--olive) 15%, transparent)" : "transparent",
        }}
      >
        <div className="wrap flex h-full items-center justify-between">
          <TransitionLink href="/" className="font-display text-[2rem] leading-none tracking-tight" aria-label="Olmo, home">
            Olmo
          </TransitionLink>

          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <TransitionLink
                key={n.href}
                href={n.href}
                className="link inline-flex min-h-11 items-center"
                aria-current={pathname === n.href ? "page" : undefined}
              >
                {n.label}
              </TransitionLink>
            ))}
            <BookButton />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <BookButton className="btn btn-primary btn-sm">Book</BookButton>
            <button
              ref={toggleRef}
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" size={26} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[150] flex flex-col bg-linen md:hidden">
          <div className="wrap flex items-center justify-between" style={{ height: "var(--header-h)" }}>
            <span className="font-display text-[2rem] leading-none">Olmo</span>
            <button
              ref={closeRef}
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full"
              aria-label="Close menu"
              onClick={() => {
                setMenuOpen(false);
                toggleRef.current?.focus();
              }}
            >
              <X aria-hidden="true" size={26} />
            </button>
          </div>
          <nav aria-label="Mobile" className="wrap flex flex-1 flex-col justify-center gap-2 pb-24">
            {[{ href: "/", label: "Home" }, ...NAV, { href: "/book", label: "Book a table" }].map((n) => (
              <TransitionLink key={n.href} href={n.href} className="font-display text-[3.2rem] leading-[1.15]" onClick={() => setMenuOpen(false)}>
                {n.label}
              </TransitionLink>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
