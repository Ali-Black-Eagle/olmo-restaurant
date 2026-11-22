"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALLERGENS, DIETARY, allergenLabel, dietaryLabel, matchesFilters } from "@/lib/allergens";
import type { MenuItemView, MenuSectionView } from "@/lib/data";
import { SIGNATURE_SLUGS } from "@/lib/menu-constants";
import { formatGBP } from "@/lib/time";
import type { Allergen, Dietary } from "@/prisma/seed-data";
import { AllergenBadges } from "./allergen-icons";

export function MenuBrowser({ sections }: { sections: MenuSectionView[] }) {
  const reduce = useReducedMotion();
  const [diet, setDiet] = useState<Dietary[]>([]);
  const [excluded, setExcluded] = useState<Allergen[]>([]);
  const [active, setActive] = useState(sections[0]?.slug ?? "");
  const [detail, setDetail] = useState<MenuItemView | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const visible = useMemo(
    () =>
      sections.map((s) => ({
        ...s,
        items: s.items.filter((i) => i.available && matchesFilters(i, diet, excluded)),
      })),
    [sections, diet, excluded],
  );
  const total = visible.reduce((n, s) => n + s.items.length, 0);
  const filtering = diet.length > 0 || excluded.length > 0;

  // Scroll-spy for the section tabs.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.getAttribute("data-section") ?? "");
      },
      { rootMargin: "-200px 0px -55% 0px" },
    );
    Object.values(sectionRefs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [visible.length, total]);

  const toggleDiet = (d: Dietary) => setDiet((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const toggleAllergen = (a: Allergen) => setExcluded((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const clear = () => {
    setDiet([]);
    setExcluded([]);
  };

  const spring = reduce ? { duration: 0.01 } : { type: "spring" as const, stiffness: 400, damping: 34 };

  return (
    <LayoutGroup>
      <div
        className="sticky z-[70] border-b border-olive/15 bg-linen"
        style={{ top: "var(--header-h)" }}
        role="region"
        aria-label="Menu filters"
      >
        <div className="wrap py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <nav aria-label="Menu sections" className="no-scrollbar -mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
              {sections.map((s) => (
                <a
                  key={s.slug}
                  href={`#${s.slug}`}
                  className="chip shrink-0"
                  aria-current={active === s.slug ? "true" : undefined}
                  data-selected={active === s.slug}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = sectionRefs.current[s.slug];
                    if (el) {
                      const bar = (e.currentTarget.closest('[role="region"]') as HTMLElement | null)?.offsetHeight ?? 80;
                      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
                      const top = el.getBoundingClientRect().top + window.scrollY - (header + bar + 16);
                      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
                      setActive(s.slug);
                    }
                  }}
                >
                  {s.name}
                </a>
              ))}
            </nav>
            <span aria-hidden="true" className="mx-1 hidden h-7 w-px shrink-0 bg-olive/30 md:block" />
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
            <div role="group" aria-label="Dietary" className="flex gap-2">
              {DIETARY.map((d) => (
                <button key={d.id} type="button" className="chip shrink-0" aria-pressed={diet.includes(d.id)} onClick={() => toggleDiet(d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
            <Popover.Root>
              <Popover.Trigger className="chip shrink-0" data-selected={excluded.length > 0}>
                {excluded.length > 0 ? `Leaving out ${excluded.length}` : "Leave out allergens"}
                <ChevronDown aria-hidden="true" size={16} />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="start"
                  sideOffset={8}
                  collisionPadding={12}
                  className="z-[300] w-[min(92vw,420px)] rounded-[18px] bg-ticket p-4"
                  style={{ boxShadow: "var(--lift)" }}
                >
                  <p className="mb-3 font-semibold">Hide dishes that contain</p>
                  <div role="group" aria-label="Allergens to leave out" className="flex flex-wrap gap-2">
                    {ALLERGENS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        role="checkbox"
                        aria-checked={excluded.includes(a.id)}
                        className="chip"
                        onClick={() => toggleAllergen(a.id)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button type="button" className="link min-h-11" onClick={() => setExcluded([])}>
                      Clear allergens
                    </button>
                    <Popover.Close className="btn btn-primary btn-sm">Show {total} dishes</Popover.Close>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap section !pt-10">
        <p className="visually-hidden" role="status" aria-live="polite">
          {filtering ? `${total} dishes match your filters` : ""}
        </p>
        {filtering && total > 0 ? (
          <p className="mb-8 text-[15px] text-olive">
            {total} {total === 1 ? "dish matches" : "dishes match"}.{" "}
            <button type="button" className="link" onClick={clear}>
              Clear filters
            </button>
          </p>
        ) : null}

        {total === 0 ? (
          <div className="py-16">
            <p className="font-display text-3xl">No dishes match those filters.</p>
            <button type="button" className="btn btn-secondary mt-6" onClick={clear}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-16">
            {visible.map((s) =>
              s.items.length === 0 ? null : (
                <section
                  key={s.slug}
                  id={s.slug}
                  data-section={s.slug}
                  ref={(el) => {
                    sectionRefs.current[s.slug] = el;
                  }}
                  aria-labelledby={`h-${s.slug}`}
                >
                  <h2 id={`h-${s.slug}`} className="mb-8 text-[2.441rem]">
                    {s.name}
                  </h2>
                  <motion.ul layout className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {s.items.map((item) => (
                        <motion.li
                          key={item.id}
                          layout="position"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96, transition: { duration: reduce ? 0.01 : 0.18 } }}
                          transition={spring}
                          className="dish"
                        >
                          <DishRow item={item} onOpen={() => setDetail(item)} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                </section>
              ),
            )}
          </div>
        )}
      </div>

      <DishDetail item={detail} onClose={() => setDetail(null)} />
    </LayoutGroup>
  );
}

function DishRow({ item, onOpen }: { item: MenuItemView; onOpen: () => void }) {
  const signature = SIGNATURE_SLUGS.includes(item.slug);
  return (
    <div className={item.imageUrl ? "grid grid-cols-[112px_1fr] items-start gap-4 sm:grid-cols-[200px_1fr] sm:gap-6" : ""}>
      {item.imageUrl ? (
        <button type="button" onClick={onOpen} className="block text-left" aria-label={`${item.name}: view details`}>
          <motion.div
            layoutId={`photo-${item.slug}`}
            className="photo aspect-[4/3] w-full"
            style={signature ? { viewTransitionName: `dish-${item.slug}` } : undefined}
          >
            <Image src={item.imageUrl} alt="" fill sizes="(min-width: 640px) 200px, 112px" />
          </motion.div>
        </button>
      ) : null}
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-sans text-[1.15rem] font-semibold leading-snug tracking-normal">
            <button type="button" onClick={onOpen} className="text-left">
              {item.name}
            </button>
          </h3>
          <span className="price shrink-0 text-[1.35rem] leading-none">{formatGBP(item.pricePence)}</span>
        </div>
        <p className="mt-1.5 max-w-[56ch] text-[16px] text-olive-ink/85">{item.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.dietary.map((d) => (
            <span key={d} className="tag">
              {dietaryLabel(d)}
            </span>
          ))}
          <AllergenBadges allergens={item.allergens} />
        </div>
      </div>
    </div>
  );
}

function DishDetail({ item, onClose }: { item: MenuItemView | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={Boolean(item)} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {item ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[140] bg-char/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0.01 : 0.2 }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-[150] flex items-end justify-center sm:items-center sm:p-6">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="pointer-events-auto max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-ticket p-5 outline-none sm:rounded-[28px]"
                  style={{ boxShadow: "var(--lift)", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
                  initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
                  transition={{ duration: reduce ? 0.01 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <Dialog.Close className="ml-auto flex size-11 items-center justify-center rounded-full" aria-label="Close details">
                    <X aria-hidden="true" size={22} />
                  </Dialog.Close>
                  {item.imageUrl ? (
                    <motion.div layoutId={`photo-${item.slug}`} className="photo aspect-[4/3] w-full">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="560px" />
                    </motion.div>
                  ) : null}
                  <div className="mt-5 flex items-baseline justify-between gap-4">
                    <Dialog.Title className="font-display text-3xl leading-tight">{item.name}</Dialog.Title>
                    <span className="price shrink-0 text-2xl">{formatGBP(item.pricePence)}</span>
                  </div>
                  <p className="mt-2 text-[17px]">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.dietary.map((d) => (
                      <span key={d} className="tag">
                        {dietaryLabel(d)}
                      </span>
                    ))}
                  </div>
                  <h4 className="mt-5 font-sans text-base font-semibold">Allergens</h4>
                  <p className="mt-1 text-[16px]">
                    {item.allergens.length ? `Contains ${item.allergens.map((a) => allergenLabel(a).toLowerCase()).join(", ")}.` : "No listed allergens."}
                  </p>
                  <p className="mt-3 text-sm text-olive">Please tell us about any allergy when you book or order. Dishes are cooked in a kitchen that handles all 14 allergens.</p>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
