"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-auth";
import { cancelBookingById } from "@/lib/booking/cancel";
import { createBookingCore } from "@/lib/booking/create";
import { moveBooking } from "@/lib/booking/modify";
import { sendBookingCancelledEmails } from "@/lib/booking/notify";
import { periodsForDate } from "@/lib/booking/slots";
import { db } from "@/lib/db";
import { getRestaurant } from "@/lib/data";
import { isDateString, isTimeString, localDate, minutesOf, toUtc } from "@/lib/time";
import { Prisma, type Allergen, type Dietary } from "@/generated/prisma/client";

export type ActionResult = { ok: true; message?: string; warnings?: string[] } | { ok: false; message: string };

const fail = (message: string): ActionResult => ({ ok: false, message });
const ok = (message?: string, warnings?: string[]): ActionResult => ({ ok: true, message, warnings });

function refreshPublic() {
  revalidatePath("/", "layout");
}
function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

/* ---------------------------------------------------------------- bookings */

const STATUSES = ["CONFIRMED", "SEATED", "COMPLETED", "NO_SHOW"] as const;

export async function setBookingStatus(id: string, status: (typeof STATUSES)[number]): Promise<ActionResult> {
  await assertAdmin();
  if (!STATUSES.includes(status)) return fail("Unknown status.");
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking || booking.status === "CANCELLED") return fail("This booking is cancelled.");
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { status } });
    // A no-show frees the table for the rest of the evening.
    if (status === "NO_SHOW") await tx.bookingTable.deleteMany({ where: { bookingId: id } });
  });
  refreshAdmin();
  return ok();
}

export async function cancelBookingAdmin(id: string, notifyGuest: boolean): Promise<ActionResult> {
  await assertAdmin();
  const booking = await db.booking.findUnique({ where: { id }, include: { tables: { include: { table: true } } } });
  if (!booking) return fail("Booking not found.");
  const tables = booking.tables.map((t) => t.table.label);
  // Staff can cancel at any time, so skip the "already started" guest rule by passing an early clock.
  const res = await cancelBookingById(db, id, new Date(0));
  if (!res.ok) return fail(res.error === "ALREADY_CANCELLED" ? "Already cancelled." : "This booking cannot be cancelled.");
  if (notifyGuest) await sendBookingCancelledEmails(res.booking, await getRestaurant(), tables);
  refreshAdmin();
  return ok(notifyGuest ? "Cancelled and the guest was emailed." : "Cancelled.");
}

const bookingSchema = z.object({
  date: z.string().refine(isDateString, "Choose a date"),
  time: z.string().refine(isTimeString, "Choose a time"),
  partySize: z.coerce.number().int().min(1).max(40),
  guestName: z.string().trim().min(1, "Enter a name").max(80),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(24),
  note: z.string().trim().max(300).optional(),
  source: z.enum(["PHONE", "ADMIN"]).default("PHONE"),
});

export async function createBookingAdmin(input: z.input<typeof bookingSchema>): Promise<ActionResult> {
  await assertAdmin();
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const d = parsed.data;
  const res = await createBookingCore(db, {
    date: d.date,
    time: d.time,
    partySize: d.partySize,
    guestName: d.guestName,
    // Walk-ins and phone bookings often have no email: use a placeholder that can never be mailed.
    email: d.email || `walk-in-${Date.now()}@no-email.invalid`,
    phone: d.phone || "none",
    note: d.note,
    source: d.source,
    online: false,
  });
  if (!res.ok) {
    return fail(res.error === "SLOT_TAKEN" ? `No table is free then. Nearest times: ${res.alternatives?.join(", ") || "none today"}.` : res.message);
  }
  refreshAdmin();
  return ok(`Booked ${res.booking.ref} on ${res.booking.tableLabels.join(" + ")}.`);
}

export async function moveBookingAdmin(id: string, input: { date: string; time: string; partySize: number }): Promise<ActionResult> {
  await assertAdmin();
  const res = await moveBooking(db, id, input);
  if (!res.ok) return fail(res.message);
  refreshAdmin();
  return ok("Booking updated.");
}

/* -------------------------------------------------------------------- hours */

const periodSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    name: z.string().trim().min(1).max(20),
    opensAt: z.string().refine(isTimeString),
    lastSeating: z.string().refine(isTimeString),
    closesAt: z.string().refine(isTimeString),
  })
  .refine((p) => minutesOf(p.opensAt) <= minutesOf(p.lastSeating) && minutesOf(p.lastSeating) <= minutesOf(p.closesAt), {
    message: "Opening, last seating and closing times must be in that order.",
  });

/** Future confirmed bookings that would no longer sit inside any service period. */
async function bookingsOutsideHours(): Promise<string[]> {
  const restaurant = await getRestaurant();
  const [weekly, specials, bookings] = await Promise.all([
    db.servicePeriod.findMany(),
    db.specialDay.findMany(),
    db.booking.findMany({ where: { status: "CONFIRMED", startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } }),
  ]);
  const out: string[] = [];
  for (const b of bookings) {
    const date = localDate(b.startsAt, restaurant.timezone);
    const sp = specials.find((s) => s.date.toISOString().slice(0, 10) === date);
    const periods = periodsForDate(date, weekly, sp ? { closed: sp.closed, periods: sp.periods as never } : null);
    const inside = periods.some((p) => {
      const start = toUtc(date, p.opensAt, restaurant.timezone).getTime();
      const last = toUtc(date, p.lastSeating, restaurant.timezone).getTime();
      return b.startsAt.getTime() >= start && b.startsAt.getTime() <= last;
    });
    if (!inside) out.push(`${b.ref} (${b.guestName}, ${date})`);
  }
  return out;
}

export async function saveWeeklyHours(periods: z.input<typeof periodSchema>[]): Promise<ActionResult> {
  await assertAdmin();
  const parsed = z.array(periodSchema).safeParse(periods);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the times.");
  await db.$transaction([db.servicePeriod.deleteMany(), db.servicePeriod.createMany({ data: parsed.data })]);
  const outside = await bookingsOutsideHours();
  refreshPublic();
  refreshAdmin();
  return ok(
    "Opening hours saved. Availability and the website update straight away.",
    outside.length ? [`${outside.length} existing booking${outside.length === 1 ? "" : "s"} now fall outside opening hours: ${outside.slice(0, 8).join(", ")}.`] : undefined,
  );
}

const specialSchema = z.object({
  date: z.string().refine(isDateString, "Choose a date"),
  closed: z.boolean(),
  note: z.string().trim().max(160).optional(),
  periods: z.array(periodSchema).optional(),
});

export async function saveSpecialDay(input: { date: string; closed: boolean; note?: string; periods?: Omit<z.input<typeof periodSchema>, "dayOfWeek">[] }): Promise<ActionResult> {
  await assertAdmin();
  const parsed = specialSchema.safeParse({
    ...input,
    periods: input.periods?.map((p) => ({ ...p, dayOfWeek: 0 })),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const d = parsed.data;
  const periods = d.closed ? null : d.periods?.map(({ name, opensAt, lastSeating, closesAt }) => ({ name, opensAt, lastSeating, closesAt })) ?? null;
  const date = new Date(`${d.date}T00:00:00.000Z`);
  await db.specialDay.upsert({
    where: { date },
    update: { closed: d.closed, note: d.note || null, periods: periods ?? Prisma.JsonNull },
    create: { date, closed: d.closed, note: d.note || null, periods: periods ?? Prisma.JsonNull },
  });
  const outside = await bookingsOutsideHours();
  refreshPublic();
  refreshAdmin();
  return ok("Special day saved.", outside.length ? [`${outside.length} existing booking(s) now fall outside opening hours: ${outside.slice(0, 8).join(", ")}.`] : undefined);
}

export async function deleteSpecialDay(id: string): Promise<ActionResult> {
  await assertAdmin();
  await db.specialDay.delete({ where: { id } }).catch(() => undefined);
  refreshPublic();
  refreshAdmin();
  return ok("Special day removed.");
}

/* ------------------------------------------------------------------- tables */

const tableSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().min(1).max(12),
    minSeats: z.coerce.number().int().min(1).max(40),
    maxSeats: z.coerce.number().int().min(1).max(40),
    zone: z.string().trim().max(30).optional(),
    active: z.boolean(),
  })
  .refine((t) => t.minSeats <= t.maxSeats, { message: "Minimum seats cannot be more than maximum seats." });

export async function saveTable(input: z.input<typeof tableSchema>): Promise<ActionResult> {
  await assertAdmin();
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const { id, ...data } = parsed.data;
  try {
    if (id) await db.diningTable.update({ where: { id }, data: { ...data, zone: data.zone || null } });
    else await db.diningTable.create({ data: { ...data, zone: data.zone || null } });
  } catch {
    return fail("A table with that label already exists.");
  }
  refreshAdmin();
  return ok("Table saved.");
}

export async function deleteTable(id: string): Promise<ActionResult> {
  await assertAdmin();
  const holds = await db.bookingTable.count({ where: { tableId: id } });
  if (holds > 0) return fail("This table has bookings. Mark it inactive instead of deleting it.");
  const inCombo = await db.tableCombo.findFirst({ where: { tableIds: { has: id } } });
  if (inCombo) return fail(`This table is part of the combination "${inCombo.label}". Remove that first.`);
  await db.diningTable.delete({ where: { id } });
  refreshAdmin();
  return ok("Table deleted.");
}

const comboSchema = z
  .object({
    id: z.string().optional(),
    tableIds: z.array(z.string()).min(2, "Pick at least two tables."),
    minSeats: z.coerce.number().int().min(1).max(60),
    maxSeats: z.coerce.number().int().min(1).max(60),
  })
  .refine((c) => c.minSeats <= c.maxSeats, { message: "Minimum seats cannot be more than maximum seats." });

export async function saveCombo(input: z.input<typeof comboSchema>): Promise<ActionResult> {
  await assertAdmin();
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const { id, ...data } = parsed.data;
  const tables = await db.diningTable.findMany({ where: { id: { in: data.tableIds } } });
  const label = tables.map((t) => t.label).sort((a, b) => a.localeCompare(b, "en", { numeric: true })).join(" + ");
  if (id) await db.tableCombo.update({ where: { id }, data: { ...data, label } });
  else await db.tableCombo.create({ data: { ...data, label } });
  refreshAdmin();
  return ok("Combination saved.");
}

export async function deleteCombo(id: string): Promise<ActionResult> {
  await assertAdmin();
  await db.tableCombo.delete({ where: { id } }).catch(() => undefined);
  refreshAdmin();
  return ok("Combination removed.");
}

/* --------------------------------------------------------------------- menu */

const ALLERGEN_IDS = ["CELERY", "GLUTEN", "CRUSTACEANS", "EGGS", "FISH", "LUPIN", "MILK", "MOLLUSCS", "MUSTARD", "NUTS", "PEANUTS", "SESAME", "SOYA", "SULPHITES"] as const;
const DIETARY_IDS = ["VEGAN", "VEGETARIAN", "GLUTEN_FREE"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const itemSchema = z.object({
  id: z.string().optional(),
  sectionId: z.string().min(1),
  name: z.string().trim().min(1, "Enter a name").max(80),
  description: z.string().trim().min(1, "Enter a description").max(240),
  price: z.coerce.number().min(0).max(1000),
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Image must be a path or an https link")
    .optional(),
  allergens: z.array(z.enum(ALLERGEN_IDS)),
  dietary: z.array(z.enum(DIETARY_IDS)),
  available: z.boolean(),
});

export async function saveMenuItem(input: z.input<typeof itemSchema>): Promise<ActionResult> {
  await assertAdmin();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const d = parsed.data;
  const data = {
    sectionId: d.sectionId,
    name: d.name,
    description: d.description,
    pricePence: Math.round(d.price * 100),
    imageUrl: d.imageUrl || null,
    allergens: d.allergens as Allergen[],
    dietary: d.dietary as Dietary[],
    available: d.available,
  };
  if (d.id) await db.menuItem.update({ where: { id: d.id }, data });
  else {
    const last = await db.menuItem.findFirst({ where: { sectionId: d.sectionId }, orderBy: { order: "desc" } });
    let slug = slugify(d.name) || "dish";
    if (await db.menuItem.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    await db.menuItem.create({ data: { ...data, slug, order: (last?.order ?? -1) + 1 } });
  }
  refreshPublic();
  refreshAdmin();
  return ok("Dish saved. The public menu is updated.");
}

export async function toggleMenuItemAvailable(id: string, available: boolean): Promise<ActionResult> {
  await assertAdmin();
  await db.menuItem.update({ where: { id }, data: { available } });
  refreshPublic();
  refreshAdmin();
  return ok(available ? "Back on the menu." : "Marked as sold out and hidden from the public menu.");
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  await assertAdmin();
  await db.menuItem.delete({ where: { id } }).catch(() => undefined);
  refreshPublic();
  refreshAdmin();
  return ok("Dish deleted.");
}

export async function reorderMenuItems(sectionId: string, orderedIds: string[]): Promise<ActionResult> {
  await assertAdmin();
  await db.$transaction(orderedIds.map((id, order) => db.menuItem.updateMany({ where: { id, sectionId }, data: { order } })));
  refreshPublic();
  return ok();
}

export async function saveMenuSection(input: { id?: string; name: string }): Promise<ActionResult> {
  await assertAdmin();
  const name = input.name.trim();
  if (!name || name.length > 40) return fail("Enter a section name (40 characters or fewer).");
  if (input.id) await db.menuSection.update({ where: { id: input.id }, data: { name } });
  else {
    const last = await db.menuSection.findFirst({ orderBy: { order: "desc" } });
    let slug = slugify(name) || "section";
    if (await db.menuSection.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    await db.menuSection.create({ data: { name, slug, order: (last?.order ?? -1) + 1 } });
  }
  refreshPublic();
  refreshAdmin();
  return ok("Section saved.");
}

export async function deleteMenuSection(id: string): Promise<ActionResult> {
  await assertAdmin();
  const count = await db.menuItem.count({ where: { sectionId: id } });
  if (count > 0) return fail("Move or delete this section's dishes first.");
  await db.menuSection.delete({ where: { id } }).catch(() => undefined);
  refreshPublic();
  refreshAdmin();
  return ok("Section deleted.");
}

/** Uploads a dish photo to Vercel Blob. Returns the public URL to store on the dish. */
export async function uploadMenuImage(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await assertAdmin();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, message: "Image upload needs BLOB_READ_WRITE_TOKEN (Vercel Blob). Until then, paste an image path or https link instead." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image first." };
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return { ok: false, message: "Use a JPEG, PNG, WebP or AVIF image." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Images must be 5 MB or smaller." };
  const { put } = await import("@vercel/blob");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const blob = await put(`menu/${Date.now()}.${ext}`, file, { access: "public", addRandomSuffix: true });
  return { ok: true, url: blob.url };
}

/* ----------------------------------------------------------------- settings */

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(5).max(24),
  email: z.string().trim().email(),
  priceRange: z.string().trim().max(8),
  cuisine: z.string().trim().max(80),
  line1: z.string().trim().min(1).max(80),
  line2: z.string().trim().max(80).optional(),
  city: z.string().trim().min(1).max(60),
  postcode: z.string().trim().min(1).max(12),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  minNoticeMin: z.coerce.number().int().min(0).max(1440),
  maxPartyOnline: z.coerce.number().int().min(1).max(20),
  slotIntervalMin: z.coerce.number().int().refine((v) => [10, 15, 20, 30].includes(v), "Slot interval must be 10, 15, 20 or 30 minutes."),
  durations: z
    .array(z.object({ maxParty: z.coerce.number().int().min(1).max(40), minutes: z.coerce.number().int().min(30).max(360) }))
    .min(1),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  await assertAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const { line1, line2, city, postcode, lat, lng, durations, ...rest } = parsed.data;
  const data = {
    ...rest,
    address: { line1, line2: line2 ?? "", city, postcode, country: "GB", lat, lng },
    durations: [...durations].sort((a, b) => a.maxParty - b.maxParty),
  };
  await db.settings.update({ where: { id: 1 }, data });
  refreshPublic();
  refreshAdmin();
  return ok("Settings saved. The website, emails and structured data use the new details.");
}
