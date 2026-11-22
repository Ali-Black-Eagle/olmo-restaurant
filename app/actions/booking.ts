"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { createBookingCore } from "@/lib/booking/create";
import { cancelBookingWithToken } from "@/lib/booking/cancel";
import { manageUrl, sendBookingCancelledEmails, sendBookingConfirmedEmails } from "@/lib/booking/notify";
import { rateLimit } from "@/lib/rate-limit";
import { getRestaurant } from "@/lib/data";
import { formatDateLong, formatInstantTime, isDateString, isTimeString, localDate } from "@/lib/time";
import type { BookingErrorCode } from "@/lib/booking/types";

const bookingSchema = z.object({
  date: z.string().refine(isDateString),
  time: z.string().refine(isTimeString),
  partySize: z.number().int().min(1).max(20),
  guestName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number we can reach you on")
    .max(24)
    .regex(/^[0-9+()\-\s]+$/, "Phone numbers can only have digits, spaces and +"),
  note: z.string().trim().max(300).optional(),
  /** Honeypot: real people never see or fill this field. */
  website: z.string().max(200).optional(),
});

export type BookingInput = z.input<typeof bookingSchema>;

export type BookingTicket = {
  ref: string;
  guestName: string;
  partySize: number;
  dateLabel: string;
  timeLabel: string;
  address: string;
  manageUrl: string;
};

export type BookingActionResult =
  | { ok: true; ticket: BookingTicket }
  | {
      ok: false;
      error: BookingErrorCode;
      message: string;
      alternatives?: string[];
      fieldErrors?: Record<string, string>;
    };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function isBot(): Promise<boolean> {
  try {
    const { checkBotId } = await import("botid/server");
    const verification = await checkBotId();
    return verification.isBot;
  } catch {
    // BotID only runs on Vercel deployments; locally there is nothing to check.
    return false;
  }
}

export async function createBookingAction(input: BookingInput): Promise<BookingActionResult> {
  if (!hasDatabase) {
    return { ok: false, error: "UNAVAILABLE", message: "Online booking is not set up yet. Please call us." };
  }

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "INVALID", message: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  // Honeypot: pretend it worked so bots learn nothing.
  if (data.website) {
    return { ok: false, error: "BOT", message: "Something went wrong. Please try again." };
  }
  if (await isBot()) {
    return { ok: false, error: "BOT", message: "We could not verify this request. Please call us to book." };
  }

  const ip = await clientIp();
  const [okIp, okEmail] = await Promise.all([
    rateLimit(db, `book:ip:${ip}`, 5, 3600),
    rateLimit(db, `book:email:${data.email.toLowerCase()}`, 3, 86400),
  ]);
  if (!okIp || !okEmail) {
    return {
      ok: false,
      error: "RATE_LIMITED",
      message: "Too many booking attempts. Please try again later or call us.",
    };
  }

  const result = await createBookingCore(db, {
    date: data.date,
    time: data.time,
    partySize: data.partySize,
    guestName: data.guestName,
    email: data.email,
    phone: data.phone,
    note: data.note,
    source: "WEB",
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message, alternatives: result.alternatives };
  }

  const restaurant = await getRestaurant();
  const { booking, token } = result;
  after(async () => {
    await sendBookingConfirmedEmails(booking, token, restaurant, booking.tableLabels);
  });

  return {
    ok: true,
    ticket: {
      ref: booking.ref,
      guestName: booking.guestName,
      partySize: booking.partySize,
      dateLabel: formatDateLong(localDate(booking.startsAt, restaurant.timezone)),
      timeLabel: formatInstantTime(booking.startsAt, restaurant.timezone),
      address: `${restaurant.address.line1}, ${restaurant.address.city}`,
      manageUrl: manageUrl(booking.ref, token),
    },
  };
}

export type CancelActionResult =
  | { ok: true }
  | { ok: false; message: string };

/** POST only (Server Actions are POST). A GET to the manage page never cancels. */
export async function cancelBookingAction(ref: string, token: string): Promise<CancelActionResult> {
  if (!hasDatabase) return { ok: false, message: "Cancelling is not available right now. Please call us." };
  const ip = await clientIp();
  if (!(await rateLimit(db, `cancel:ip:${ip}`, 20, 3600))) {
    return { ok: false, message: "Too many attempts. Please try again later or call us." };
  }
  const result = await cancelBookingWithToken(db, ref, token);
  if (!result.ok) {
    const messages = {
      NOT_FOUND: "We could not find that booking. Check the link in your email.",
      ALREADY_CANCELLED: "This booking is already cancelled.",
      TOO_LATE: "This booking has already started, so it can no longer be cancelled online. Please call us.",
      NOT_CANCELLABLE: "This booking can no longer be cancelled online. Please call us.",
    } as const;
    return { ok: false, message: messages[result.error] };
  }
  const restaurant = await getRestaurant();
  after(async () => {
    await sendBookingCancelledEmails(result.booking, restaurant);
  });
  return { ok: true };
}
