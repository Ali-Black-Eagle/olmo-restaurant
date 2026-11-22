"use client";

import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { ALLERGENS, allergenLabel } from "@/lib/allergens";
import type { Allergen } from "@/prisma/seed-data";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Custom 14-glyph set for the UK/EU allergens. Drawn on a 24px grid, outline only. */
const GLYPHS: Record<Allergen, ReactNode> = {
  CELERY: (
    <g {...stroke}>
      <path d="M9 20c0-5 .5-9 3-15M12.5 20c.2-4.5 1.5-8 5-13M9 20h4" />
      <path d="M12 5c-1-1.6-2.8-2-4-1.4M17.5 7c.2-1.8-.8-3-2.2-3.3" />
    </g>
  ),
  GLUTEN: (
    <g {...stroke}>
      <path d="M12 21V8" />
      <path d="M12 8c-2-.5-3-2-3-4 2 .3 3 1.5 3 4Zm0 0c2-.5 3-2 3-4-2 .3-3 1.5-3 4Z" />
      <path d="M12 13c-2-.5-3.2-2-3.2-4M12 13c2-.5 3.2-2 3.2-4M12 17.5c-2-.5-3.2-2-3.2-4M12 17.5c2-.5 3.2-2 3.2-4" />
    </g>
  ),
  CRUSTACEANS: (
    <g {...stroke}>
      <path d="M8 19c-3-1-4-4-3-7 1-3 4-5 7-5s6 2 7 5c1 3 0 6-3 7" />
      <path d="M9 10 6 6M15 10l3-4M10 14h4M10 17h4" />
    </g>
  ),
  EGGS: (
    <g {...stroke}>
      <path d="M12 4c-3.5 0-6 5-6 9a6 6 0 0 0 12 0c0-4-2.5-9-6-9Z" />
    </g>
  ),
  FISH: (
    <g {...stroke}>
      <path d="M3.5 12c2.5-4 6-5.5 9-5.5 3 0 5.5 2 7 5.5-1.500 3.500-4 5.500-7 5.500-3 0-6.500-1.500-9-5.500Z" />
      <path d="m19.500 12 2-3v6l-2-3ZM9 11.500h.01" />
    </g>
  ),
  LUPIN: (
    <g {...stroke}>
      <path d="M12 21V9M12 9c-1.500-1-2-2.500-1.500-4M12 9c1.500-1 2-2.500 1.500-4M12 14c-2-.5-3-2-3-3.500M12 14c2-.5 3-2 3-3.500M12 18c-2-.5-3-2-3-3.500M12 18c2-.5 3-2 3-3.500" />
    </g>
  ),
  MILK: (
    <g {...stroke}>
      <path d="M9 3h6M9.500 3v3L7 9.500V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.500L14.500 6V3M7 13h10" />
    </g>
  ),
  MOLLUSCS: (
    <g {...stroke}>
      <path d="M4 17c0-6 3.500-11 8-11s8 5 8 11H4Z" />
      <path d="M12 6v11M8 8c-1 2-1.500 5-1.500 9M16 8c1 2 1.500 5 1.500 9" />
    </g>
  ),
  MUSTARD: (
    <g {...stroke}>
      <path d="M8 8h8l1 3v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8l1-3ZM10 8V5h4v3M7 13h10" />
    </g>
  ),
  NUTS: (
    <g {...stroke}>
      <path d="M12 21c-4 0-6.500-3-6.500-6.500 0-3 2-5 4-6.500L12 6l2.500 2c2 1.500 4 3.500 4 6.500C18.500 18 16 21 12 21ZM9.500 4.500C10.500 3.500 13.500 3.500 14.500 4.500M12 6v3" />
    </g>
  ),
  PEANUTS: (
    <g {...stroke}>
      <path d="M8.500 4.500c2-1.500 4.500-.5 5 1.500.4 1.500-.2 2.500-.7 3.500-.6 1.200-.2 2 .7 3 1 1.100 2.500 1.500 2.500 4 0 2.500-2 3.500-3.800 3.500-2.200 0-3.700-1.500-3.700-3.300 0-1.500.8-2.200 1-3.200.3-1.300-1.200-2-1.500-3.500-.3-1.500-.1-3.300 1.500-4.500Z" />
    </g>
  ),
  SESAME: (
    <g {...stroke}>
      <path d="M8 8c1.500-1 3 0 3 1.500S9.500 12 8 11.500 6.500 9 8 8ZM15 6c1.500 0 2.500 1.500 1.800 2.800S14.500 10 14 8.500 13.800 6 15 6ZM14 14c1.500-.5 3 .5 2.800 2s-2 2.200-3 1.200-.8-2.800.2-3.200ZM7 15c1-1 2.800-.5 3 1s-1 2.500-2.200 2.200S6 16 7 15Z" />
    </g>
  ),
  SOYA: (
    <g {...stroke}>
      <path d="M6 8c0-2.500 3-3.500 5-2.500S14 9 14 11s2.500 2 4 3.500c1.500 1.500.5 4.500-2 5s-4-1.500-5.500-3C9 14 6 12 6 8Z" />
      <path d="M10 10.500h.01M14 15.500h.01" />
    </g>
  ),
  SULPHITES: (
    <g>
      <text x="12" y="15.500" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" fontFamily="var(--font-hanken), sans-serif">
        SO₂
      </text>
    </g>
  ),
};

export function AllergenGlyph({ id, size = 24 }: { id: Allergen; size?: number }) {
  return (
    <span className="allergen" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size - 6} height={size - 6}>
        {GLYPHS[id]}
      </svg>
    </span>
  );
}

/**
 * Allergen glyphs for one dish. Every glyph is a 44px tap target that opens its full name,
 * and the whole list is also written out as text for screen readers.
 */
export function AllergenBadges({ allergens }: { allergens: Allergen[] }) {
  if (allergens.length === 0) return <p className="text-sm text-olive">No listed allergens</p>;
  const names = allergens.map(allergenLabel).join(", ");
  return (
    <div className="-mx-2.5 flex flex-wrap items-center">
      <span className="visually-hidden">Contains: {names}</span>
      {allergens.map((a) => (
        <Popover.Root key={a}>
          <Popover.Trigger
            className="inline-flex size-11 items-center justify-center rounded-full"
            aria-label={`Allergen: ${allergenLabel(a)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <AllergenGlyph id={a} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="top"
              sideOffset={4}
              collisionPadding={12}
              className="z-[300] rounded-full bg-olive-ink px-3.5 py-1.5 text-sm font-semibold text-ticket"
            >
              Contains {allergenLabel(a).toLowerCase()}
              <Popover.Arrow className="fill-olive-ink" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ))}
    </div>
  );
}

export { ALLERGENS };
