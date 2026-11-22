import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { JsonLd } from "@/components/site/json-ld";
import { getMenu } from "@/lib/data";
import { breadcrumbJsonLd, menuJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Olmo's menu: snacks, flatbreads from the oak oven, plates, sweet things and natural wine. Every dish lists its allergens and dietary tags.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const sections = await getMenu();
  return (
    <>
      <section className="wrap" style={{ paddingTop: "calc(var(--header-h) + 24px)" }}>
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)]">The menu</h1>
        <p className="mt-4 max-w-[60ch] text-[1.1rem]">
          Small plates to share, flatbreads from the oak oven and a few bigger plates. It changes with the week. Filter by diet, or hide any of the 14
          allergens.
        </p>
      </section>
      <div className="mt-8">
        <MenuBrowser sections={sections} />
      </div>
      <JsonLd data={menuJsonLd(sections)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Menu", path: "/menu" },
        ])}
      />
    </>
  );
}
