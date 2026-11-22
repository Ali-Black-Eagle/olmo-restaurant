import type { Metadata } from "next";
import Image from "next/image";
import { BookButton } from "@/components/booking/book-button";
import { HoursTable } from "@/components/site/hours-table";
import { mapsLink } from "@/components/site/footer";
import { MapFacade } from "@/components/site/map-facade";
import { TonightStrip } from "@/components/site/tonight-strip";
import { TransitionLink } from "@/components/site/transition-link";
import { SIGNATURE_SLUGS } from "@/lib/menu-constants";
import { formatAddress, getMenu, getRestaurant, getUpcomingSpecialDays, getWeeklyHours, hoursRows } from "@/lib/data";
import { formatGBP } from "@/lib/time";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Olmo: wood-fired kitchen and table booking in Bristol" },
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [restaurant, weekly, menu] = await Promise.all([getRestaurant(), getWeeklyHours(), getMenu()]);
  const special = await getUpcomingSpecialDays(restaurant.timezone);
  const all = menu.flatMap((s) => s.items);
  const dishes = SIGNATURE_SLUGS.map((slug) => all.find((i) => i.slug === slug)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const [big, ...small] = dishes;
  const addressLine = formatAddress(restaurant.address);

  return (
    <>
      {/* Hero */}
      <section className="wrap overflow-x-clip pb-10 md:pb-16" style={{ paddingTop: "calc(var(--header-h) + 8px)" }}>
        <div className="grid items-center gap-8 md:grid-cols-12 md:gap-6">
          <div
            className="hero-photo photo order-1 aspect-[4/3] md:order-2 md:col-span-7 md:aspect-auto md:h-[clamp(520px,78svh,760px)] md:!rounded-r-none hero-bleed"
          >
            <Image
              src="/images/hero-oven-pizza.jpg"
              alt="A pizza straight from the wood-fired oven, blistered and bubbling, with sprigs of rosemary and cherry tomatoes"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width: 768px) 58vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="order-2 md:order-1 md:col-span-5 md:pr-6">
            <h1 className="text-hero">
              <span className="hero-line" style={{ ["--i" as string]: 0 }}>
                <span>Cooked over oak.</span>
              </span>
              <span className="hero-line" style={{ ["--i" as string]: 1 }}>
                <span>Booked in three taps.</span>
              </span>
            </h1>
            <div className="hero-copy">
              <p className="mt-6 max-w-[44ch] text-[1.15rem]">
                Olmo is a wood-fired kitchen in Bristol. Small plates, flatbreads from the oak oven and natural wine, Tuesday to Sunday.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <BookButton />
                <TransitionLink href="/menu" className="btn btn-secondary">
                  See the menu
                </TransitionLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TonightStrip />

      {/* Signature dishes */}
      {big ? (
        <section className="wrap section" aria-labelledby="dishes-h">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="dishes-h" className="text-[clamp(2rem,4vw,3.052rem)]">
              What people order first
            </h2>
            <TransitionLink href="/menu" className="link inline-flex min-h-11 items-center">
              Full menu
            </TransitionLink>
          </div>
          <div className="grid gap-10 md:grid-cols-12 md:gap-6">
            <article className="dish md:col-span-7">
              <TransitionLink href="/menu" aria-label={`${big.name}, on the menu`} className="block">
                <div className="photo aspect-[4/3] w-full" style={{ viewTransitionName: `dish-${big.slug}` }}>
                  {big.imageUrl ? <Image src={big.imageUrl} alt="" fill sizes="(min-width: 768px) 58vw, 100vw" /> : null}
                </div>
              </TransitionLink>
              <DishText name={big.name} price={big.pricePence} description={big.description} large />
            </article>
            <div className="grid gap-10 md:col-span-5">
              {small.map((d) => (
                <article key={d.slug} className="dish">
                  <TransitionLink href="/menu" aria-label={`${d.name}, on the menu`} className="block">
                    <div className="photo aspect-[16/10] w-full" style={{ viewTransitionName: `dish-${d.slug}` }}>
                      {d.imageUrl ? <Image src={d.imageUrl} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" /> : null}
                    </div>
                  </TransitionLink>
                  <DishText name={d.name} price={d.pricePence} description={d.description} />
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* The room */}
      <section className="wrap pb-[clamp(64px,10vw,140px)]" aria-labelledby="room-h">
        <div className="photo aspect-[16/9] w-full md:aspect-[21/9]">
          <Image
            src="/images/dining-room.jpg"
            alt="The Olmo dining room in the evening, with set tables, dark timber and warm light"
            fill
            sizes="(min-width: 1360px) 1312px, 100vw"
          />
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-12">
          <h2 id="room-h" className="text-[clamp(2rem,4vw,3.052rem)] md:col-span-5">
            The oven sets the pace
          </h2>
          <div className="md:col-span-6 md:col-start-7">
            <p className="max-w-[60ch] text-[1.1rem]">
              We light the oak oven at nine each morning and it takes three hours to come up to temperature. Bread goes in first, then flatbreads, then whatever the
              vegetables and the butcher have sent that day. There are 42 seats, one short menu and no rush.
            </p>
            <p className="mt-4 max-w-[60ch] text-[1.1rem]">
              Vegetables come from two farms within twenty miles. The pork is from a butcher on Gloucester Road, and the wine list is mostly small growers who add
              as little as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Visit */}
      <section className="border-t border-olive/20 bg-ticket/50 section" aria-labelledby="visit-h">
        <div className="wrap">
          <h2 id="visit-h" className="mb-10 text-[clamp(2rem,4vw,3.052rem)]">
            Come and eat
          </h2>
          <div className="grid gap-12 lg:grid-cols-3">
            <div>
              <h3 className="mb-3 font-sans text-base font-semibold tracking-normal">Opening hours</h3>
              <HoursTable rows={hoursRows(weekly)} timezone={restaurant.timezone} special={special} />
            </div>
            <MapFacade query={`${restaurant.name}, ${addressLine}`} lat={restaurant.address.lat} lng={restaurant.address.lng} />
            <div>
              <h3 className="mb-3 font-sans text-base font-semibold tracking-normal">Address and phone</h3>
              <address className="not-italic leading-7">
                {restaurant.name}
                <br />
                {restaurant.address.line1}
                <br />
                {restaurant.address.city} {restaurant.address.postcode}
              </address>
              <p className="mt-3">
                <a className="link inline-flex min-h-11 items-center" href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
                  {restaurant.phone}
                </a>
              </p>
              <p>
                <a className="link inline-flex min-h-11 items-center" href={mapsLink(restaurant)} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps
                </a>
              </p>
              <p className="mt-4 text-[15px] text-olive">Parties of {restaurant.rules.maxPartyOnline + 1} or more, please call us.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DishText({ name, price, description, large = false }: { name: string; price: number; description: string; large?: boolean }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={`font-sans font-semibold leading-snug tracking-normal ${large ? "text-[1.35rem]" : "text-[1.15rem]"}`}>{name}</h3>
        <span className={`price shrink-0 leading-none ${large ? "text-[1.6rem]" : "text-[1.35rem]"}`}>{formatGBP(price)}</span>
      </div>
      <p className="mt-1.5 max-w-[52ch] text-olive-ink/85">{description}</p>
    </div>
  );
}
