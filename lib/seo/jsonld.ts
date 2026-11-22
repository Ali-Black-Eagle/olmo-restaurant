import type { MenuSectionView, Restaurant } from "@/lib/data";
import { formatAddress, siteUrl } from "@/lib/data";
import type { WeeklyPeriod } from "@/lib/booking/types";
import { DAY_NAMES } from "@/lib/time";

const DIET_URL: Record<string, string> = {
  VEGAN: "https://schema.org/VeganDiet",
  VEGETARIAN: "https://schema.org/VegetarianDiet",
  GLUTEN_FREE: "https://schema.org/GlutenFreeDiet",
};

export function restaurantJsonLd(r: Restaurant, weekly: WeeklyPeriod[]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${base}/#restaurant`,
    name: r.name,
    url: base,
    image: [`${base}/opengraph-image`],
    telephone: r.phone,
    email: r.email,
    priceRange: r.priceRange,
    servesCuisine: r.cuisine.split(",").map((s) => s.trim()),
    address: {
      "@type": "PostalAddress",
      streetAddress: [r.address.line1, r.address.line2].filter(Boolean).join(", "),
      addressLocality: r.address.city,
      postalCode: r.address.postcode,
      addressCountry: r.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: r.address.lat, longitude: r.address.lng },
    openingHoursSpecification: weekly.map((p) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[p.dayOfWeek],
      opens: p.opensAt,
      closes: p.closesAt,
    })),
    acceptsReservations: true,
    hasMenu: `${base}/menu`,
    potentialAction: {
      "@type": "ReserveAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/book`, inLanguage: "en-GB", actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] },
      result: { "@type": "Reservation", name: `Book a table at ${r.name}` },
    },
  };
}

export function menuJsonLd(sections: MenuSectionView[]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${base}/menu#menu`,
    name: "Olmo menu",
    inLanguage: "en-GB",
    hasMenuSection: sections.map((s) => ({
      "@type": "MenuSection",
      name: s.name,
      hasMenuItem: s.items
        .filter((i) => i.available)
        .map((i) => ({
          "@type": "MenuItem",
          name: i.name,
          description: i.description,
          ...(i.imageUrl ? { image: `${base}${i.imageUrl}` } : {}),
          offers: { "@type": "Offer", price: (i.pricePence / 100).toFixed(2), priceCurrency: "GBP" },
          ...(i.dietary.length ? { suitableForDiet: i.dietary.map((d) => DIET_URL[d]) } : {}),
        })),
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  };
}

export { formatAddress };
