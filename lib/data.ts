import { cache } from "react";
import { db, hasDatabase } from "@/lib/db";
import { combosSeed, menuSeed, periodsSeed, settingsSeed } from "@/prisma/seed-data";
import type { Allergen, Dietary } from "@/prisma/seed-data";
import { toRulesSettings } from "@/lib/booking/data";
import type { Period, RulesSettings, WeeklyPeriod } from "@/lib/booking/types";
import { DAY_NAMES, addDays, dayOfWeek, localDate } from "@/lib/time";

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  lat: number;
  lng: number;
};

export type Restaurant = {
  name: string;
  timezone: string;
  phone: string;
  email: string;
  priceRange: string;
  cuisine: string;
  address: Address;
  rules: RulesSettings;
};

export type MenuItemView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pricePence: number;
  imageUrl: string | null;
  allergens: Allergen[];
  dietary: Dietary[];
  available: boolean;
};
export type MenuSectionView = { id: string; slug: string; name: string; items: MenuItemView[] };

export type SpecialDayView = { date: string; closed: boolean; note: string | null; periods: Period[] | null };

function toRestaurant(s: typeof settingsSeed | NonNullable<Awaited<ReturnType<typeof db.settings.findUnique>>>): Restaurant {
  return {
    name: s.name,
    timezone: s.timezone,
    phone: s.phone,
    email: s.email,
    priceRange: s.priceRange,
    cuisine: s.cuisine,
    address: s.address as Address,
    rules: toRulesSettings(s),
  };
}

export const getRestaurant = cache(async (): Promise<Restaurant> => {
  if (!hasDatabase) return toRestaurant(settingsSeed);
  const s = await db.settings.findUnique({ where: { id: 1 } });
  return toRestaurant(s ?? settingsSeed);
});

export const getWeeklyHours = cache(async (): Promise<WeeklyPeriod[]> => {
  if (!hasDatabase) return periodsSeed;
  const rows = await db.servicePeriod.findMany({ orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }] });
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    name: r.name,
    opensAt: r.opensAt,
    lastSeating: r.lastSeating,
    closesAt: r.closesAt,
  }));
});

export const getUpcomingSpecialDays = cache(async (timezone: string): Promise<SpecialDayView[]> => {
  if (!hasDatabase) return [];
  const today = localDate(new Date(), timezone);
  const rows = await db.specialDay.findMany({
    where: { date: { gte: new Date(`${today}T00:00:00.000Z`) } },
    orderBy: { date: "asc" },
    take: 12,
  });
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    closed: r.closed,
    note: r.note,
    periods: (r.periods as Period[] | null) ?? null,
  }));
});

/** Dates the booking UI should grey out: closed special days within the booking window. */
export const getClosedDates = cache(async (timezone: string, windowDays: number): Promise<string[]> => {
  const today = localDate(new Date(), timezone);
  const days = await getUpcomingSpecialDays(timezone);
  return days.filter((d) => d.closed && d.date <= addDays(today, windowDays)).map((d) => d.date);
});

export const getMenu = cache(async (): Promise<MenuSectionView[]> => {
  if (!hasDatabase) {
    return menuSeed.map((s) => ({
      id: s.slug,
      slug: s.slug,
      name: s.name,
      items: s.items.map((i) => ({
        id: i.slug,
        slug: i.slug,
        name: i.name,
        description: i.description,
        pricePence: i.pricePence,
        imageUrl: i.image ?? null,
        allergens: i.allergens,
        dietary: i.dietary,
        available: true,
      })),
    }));
  }
  const sections = await db.menuSection.findMany({
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return sections.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    items: s.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      description: i.description,
      pricePence: i.pricePence,
      imageUrl: i.imageUrl,
      allergens: i.allergens as Allergen[],
      dietary: i.dietary as Dietary[],
      available: i.available,
    })),
  }));
});

export { combosSeed };

export type HoursRow = { label: string; dayOfWeek: number; periods: Period[] };

/** Monday-first rows for display; days with no periods read as closed. */
export function hoursRows(weekly: WeeklyPeriod[]): HoursRow[] {
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
    label: DAY_NAMES[dow],
    dayOfWeek: dow,
    periods: weekly
      .filter((p) => p.dayOfWeek === dow)
      .map(({ name, opensAt, lastSeating, closesAt }) => ({ name, opensAt, lastSeating, closesAt })),
  }));
}

export function todayDow(timezone: string): number {
  return dayOfWeek(localDate(new Date(), timezone));
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function formatAddress(a: Address): string {
  return [a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ");
}

