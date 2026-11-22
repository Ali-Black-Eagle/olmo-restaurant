import type { Metadata } from "next";
import { HoursTable } from "@/components/site/hours-table";
import { JsonLd } from "@/components/site/json-ld";
import { mapsLink } from "@/components/site/footer";
import { MapFacade } from "@/components/site/map-facade";
import { BookButton } from "@/components/booking/book-button";
import { formatAddress, getRestaurant, getUpcomingSpecialDays, getWeeklyHours, hoursRows } from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Visit",
  description: "Opening hours, address, phone number and how to get to Olmo in Bristol.",
  alternates: { canonical: "/visit" },
};

export default async function VisitPage() {
  const [restaurant, weekly] = await Promise.all([getRestaurant(), getWeeklyHours()]);
  const special = await getUpcomingSpecialDays(restaurant.timezone);
  const address = formatAddress(restaurant.address);
  return (
    <>
      <section className="wrap pb-[clamp(64px,10vw,140px)]" style={{ paddingTop: "calc(var(--header-h) + 24px)" }}>
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)]">Visit Olmo</h1>
        <p className="mt-4 max-w-[60ch] text-[1.1rem]">
          We are open Tuesday to Sunday for lunch and dinner. Tables are held for 15 minutes, and walk-ins are welcome at the oven counter when there is room.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-[1.953rem]">Opening hours</h2>
            <HoursTable rows={hoursRows(weekly)} timezone={restaurant.timezone} special={special} />
            <div className="mt-8">
              <BookButton />
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-[1.953rem]">Find us</h2>
            <MapFacade query={`${restaurant.name}, ${address}`} lat={restaurant.address.lat} lng={restaurant.address.lng} />
            <address className="mt-6 not-italic leading-7">
              {restaurant.name}
              <br />
              {restaurant.address.line1}
              <br />
              {restaurant.address.city} {restaurant.address.postcode}
            </address>
            <p>
              <a className="link inline-flex min-h-11 items-center" href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
                {restaurant.phone}
              </a>
            </p>
            <p>
              <a className="link inline-flex min-h-11 items-center" href={mapsLink(restaurant)} target="_blank" rel="noopener noreferrer">
                Open in Google Maps
              </a>
            </p>
            <h3 className="mb-2 mt-8 font-sans text-base font-semibold tracking-normal">Getting here</h3>
            <ul className="grid max-w-[60ch] gap-2 text-[16px]">
              <li>On foot: eight minutes from Bristol Temple Meads, along the harbourside path.</li>
              <li>By bus: routes 1 and 2 stop on the corner of Pip Lane.</li>
              <li>By bike: there are Sheffield stands outside the door.</li>
              <li>By car: the nearest public car park is a five minute walk. We have no parking of our own.</li>
            </ul>
            <p className="mt-4 text-[15px] text-olive">These directions are invented for the demo.</p>
          </div>
        </div>
      </section>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Visit", path: "/visit" },
        ])}
      />
    </>
  );
}
