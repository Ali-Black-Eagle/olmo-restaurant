import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "@/components/booking/ticket";
import { db, hasDatabase } from "@/lib/db";
import { findBookingByToken } from "@/lib/booking/cancel";
import { formatAddress, getRestaurant } from "@/lib/data";
import { formatDateLong, formatInstantTime, localDate } from "@/lib/time";
import { CancelPanel } from "./cancel-panel";

// The token lives in the URL: never index, never leak it in a Referer header.
export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

function hasStarted(startsAt: Date): boolean {
  return startsAt.getTime() <= Date.now();
}

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { ref } = await params;
  const { t } = await searchParams;
  const token = Array.isArray(t) ? t[0] : t;
  const restaurant = await getRestaurant();
  const booking = hasDatabase ? await findBookingByToken(db, ref, token) : null;

  return (
    <section className="wrap pb-24" style={{ paddingTop: "calc(var(--header-h) + 24px)" }}>
      {!booking ? (
        <div className="max-w-[56ch]">
          <h1 className="text-[clamp(2.2rem,5vw,3.6rem)]">We could not open that booking</h1>
          <p className="mt-4 text-[1.1rem]">
            The link may be incomplete or out of date. Use the link in your confirmation email, or call us on{" "}
            <a className="link" href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
              {restaurant.phone}
            </a>
            .
          </p>
          <Link href="/book" className="btn btn-secondary mt-6">
            Book a table
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <h1 className="text-[clamp(2.2rem,5vw,3.6rem)]">
              {booking.status === "CANCELLED" ? "This booking is cancelled" : "Your booking"}
            </h1>
            <p className="mt-4 max-w-[48ch] text-[1.1rem]">
              {booking.status === "CANCELLED"
                ? "The table has been released. You can book another time whenever you like."
                : "Keep this page or your confirmation email. You can cancel here until the booking starts."}
            </p>
            <div className="mt-8">
              <CancelPanel
                bookingRef={booking.ref}
                token={token ?? ""}
                status={booking.status}
                started={hasStarted(booking.startsAt)}
                phone={restaurant.phone}
              />
            </div>
          </div>
          <Ticket
            data={{
              bookingRef: booking.ref,
              guestName: booking.guestName,
              partySize: booking.partySize,
              dateLabel: formatDateLong(localDate(booking.startsAt, restaurant.timezone)),
              timeLabel: formatInstantTime(booking.startsAt, restaurant.timezone),
              address: `${restaurant.address.line1}, ${restaurant.address.city}`,
              stamp: booking.status === "CANCELLED" ? "Cancelled" : undefined,
            }}
          />
          <p className="sr-only">{formatAddress(restaurant.address)}</p>
        </div>
      )}
    </section>
  );
}
