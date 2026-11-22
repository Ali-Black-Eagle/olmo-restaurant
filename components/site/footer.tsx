import type { HoursRow, Restaurant } from "@/lib/data";
import { formatAddress } from "@/lib/data";
import { formatClock } from "@/lib/time";
import { TransitionLink } from "./transition-link";

export function mapsLink(r: Restaurant) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${formatAddress(r.address)}`)}`;
}

export function hoursSummary(row: HoursRow): string {
  if (row.periods.length === 0) return "Closed";
  return row.periods.map((p) => `${formatClock(p.opensAt)} to ${formatClock(p.closesAt)}`).join(", ");
}

export function Footer({ restaurant, hours }: { restaurant: Restaurant; hours: HoursRow[] }) {
  const tel = restaurant.phone.replace(/\s/g, "");
  return (
    <footer id="site-footer" className="bg-olive-ink text-linen" style={{ paddingBlock: "clamp(48px, 8vw, 96px)" }}>
      <div className="wrap grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-5xl leading-none">Olmo</p>
          <p className="mt-4 max-w-[34ch] text-linen/80">
            A neighbourhood kitchen cooking over oak. Small plates, flatbreads from the oven, natural wine.
          </p>
        </div>

        <div>
          <h2 className="font-sans text-base font-semibold tracking-normal">Find us</h2>
          <address className="mt-3 not-italic leading-7">
            {restaurant.address.line1}
            <br />
            {restaurant.address.city} {restaurant.address.postcode}
            <br />
            <a className="link text-linen" href={`tel:${tel}`}>
              {restaurant.phone}
            </a>
          </address>
          <p className="mt-3">
            <a className="link text-linen" href={mapsLink(restaurant)} target="_blank" rel="noopener noreferrer">
              Open in Google Maps
            </a>
          </p>
          <ul className="mt-6 grid gap-1">
            <li>
              <TransitionLink className="link inline-flex min-h-11 items-center text-linen" href="/menu">
                Menu
              </TransitionLink>
            </li>
            <li>
              <TransitionLink className="link inline-flex min-h-11 items-center text-linen" href="/book">
                Book a table
              </TransitionLink>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-base font-semibold tracking-normal">Opening hours</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[15px]">
            {hours.map((h) => (
              <div key={h.label} className="contents">
                <dt className="text-linen/70">{h.label}</dt>
                <dd>{hoursSummary(h)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="wrap mt-14 border-t border-linen/20 pt-6 text-sm text-linen/70">
        <p>Olmo is a fictional restaurant built as a demo. The address, phone number and menu are invented.</p>
      </div>
    </footer>
  );
}
