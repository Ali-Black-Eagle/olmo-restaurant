import { createElement } from "react";
import type { Booking } from "@/generated/prisma/client";
import BookingCancelled from "@/emails/BookingCancelled";
import BookingConfirmed from "@/emails/BookingConfirmed";
import StaffNewBooking from "@/emails/StaffNewBooking";
import { sendEmail } from "@/lib/email";
import { formatAddress, siteUrl, type Restaurant } from "@/lib/data";
import { buildIcs, googleCalendarUrl } from "@/lib/ics";
import { formatDateLong, formatInstantTime, localDate } from "@/lib/time";

type BookingLike = Pick<
  Booking,
  "id" | "ref" | "startsAt" | "endsAt" | "partySize" | "guestName" | "email" | "phone" | "note"
>;

function mapUrl(r: Restaurant) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${r.name}, ${formatAddress(r.address)}`)}`;
}

export function manageUrl(ref: string, token: string) {
  return `${siteUrl()}/booking/${ref}?t=${encodeURIComponent(token)}`;
}

/** Guest confirmation (with .ics) and staff notification. Failures are logged, never thrown. */
export async function sendBookingConfirmedEmails(b: BookingLike, token: string, r: Restaurant, tables: string[]) {
  const tz = r.timezone;
  const dateLabel = formatDateLong(localDate(b.startsAt, tz));
  const timeLabel = formatInstantTime(b.startsAt, tz);
  const event = {
    uid: b.id,
    start: b.startsAt,
    end: b.endsAt,
    summary: `Table for ${b.partySize} at ${r.name}`,
    description: `Booking ${b.ref}. Manage or cancel: ${manageUrl(b.ref, token)}`,
    location: `${r.name}, ${formatAddress(r.address)}`,
  };
  await Promise.all([
    sendEmail({
      to: b.email,
      subject: `Your table at ${r.name}: ${dateLabel}, ${timeLabel}`,
      idempotencyKey: `booking-confirmed/${b.id}`,
      react: createElement(BookingConfirmed, {
        bookingRef: b.ref,
        guestName: b.guestName,
        dateLabel,
        timeLabel,
        partySize: b.partySize,
        address: formatAddress(r.address),
        phone: r.phone,
        manageUrl: manageUrl(b.ref, token),
        mapUrl: mapUrl(r),
        googleCalendarUrl: googleCalendarUrl(event),
        note: b.note,
      }),
      attachments: [{ filename: `olmo-${b.ref}.ics`, content: buildIcs(event), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
    }),
    notifyStaff("new", b, r, tables),
  ]);
}

export async function sendBookingCancelledEmails(b: BookingLike, r: Restaurant, tables: string[] = []) {
  const tz = r.timezone;
  const dateLabel = formatDateLong(localDate(b.startsAt, tz));
  const timeLabel = formatInstantTime(b.startsAt, tz);
  await Promise.all([
    sendEmail({
      to: b.email,
      subject: `Booking ${b.ref} cancelled`,
      idempotencyKey: `booking-cancelled/${b.id}`,
      react: createElement(BookingCancelled, {
        bookingRef: b.ref,
        guestName: b.guestName,
        dateLabel,
        timeLabel,
        partySize: b.partySize,
        bookUrl: `${siteUrl()}/book`,
      }),
    }),
    notifyStaff("cancelled", b, r, tables),
  ]);
}

async function notifyStaff(kind: "new" | "cancelled", b: BookingLike, r: Restaurant, tables: string[]) {
  const to = process.env.STAFF_NOTIFY_EMAIL;
  if (!to) return;
  const tz = r.timezone;
  await sendEmail({
    to,
    subject: `${kind === "new" ? "New booking" : "Cancelled"}: ${b.guestName}, ${b.partySize}, ${formatDateLong(localDate(b.startsAt, tz))} ${formatInstantTime(b.startsAt, tz)}`,
    idempotencyKey: `staff-${kind}/${b.id}`,
    react: createElement(StaffNewBooking, {
      kind,
      bookingRef: b.ref,
      guestName: b.guestName,
      email: b.email,
      phone: b.phone,
      dateLabel: formatDateLong(localDate(b.startsAt, tz)),
      timeLabel: formatInstantTime(b.startsAt, tz),
      partySize: b.partySize,
      tables: tables.join(", "),
      note: b.note,
      adminUrl: `${siteUrl()}/admin`,
    }),
  });
}
