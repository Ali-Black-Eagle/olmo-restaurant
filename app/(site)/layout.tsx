import { BookingProvider } from "@/components/booking/booking-provider";
import type { BookingConfig } from "@/components/booking/types";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { JsonLd } from "@/components/site/json-ld";
import { StickyBookBar } from "@/components/site/sticky-book-bar";
import { ViewTransitionGate } from "@/components/site/transition-link";
import { hasDatabase } from "@/lib/db";
import { getClosedDates, getRestaurant, getWeeklyHours, hoursRows } from "@/lib/data";
import { restaurantJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [restaurant, weekly] = await Promise.all([getRestaurant(), getWeeklyHours()]);
  const closedDates = await getClosedDates(restaurant.timezone, restaurant.rules.bookingWindowDays);

  const config: BookingConfig = {
    maxParty: restaurant.rules.maxPartyOnline,
    windowDays: restaurant.rules.bookingWindowDays,
    timezone: restaurant.timezone,
    openDows: [...new Set(weekly.map((p) => p.dayOfWeek))],
    closedDates,
    phone: restaurant.phone,
    enabled: hasDatabase,
  };

  return (
    <BookingProvider config={config}>
      <ViewTransitionGate />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer restaurant={restaurant} hours={hoursRows(weekly)} />
      <StickyBookBar />
      <JsonLd data={restaurantJsonLd(restaurant, weekly)} />
    </BookingProvider>
  );
}
