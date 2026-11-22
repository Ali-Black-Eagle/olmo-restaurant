import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { BookPageFlow } from "./book-page-flow";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Book a table",
  description: "Book a table at Olmo in Bristol. Pick your party size and a time, and you are booked. We email you a confirmation with a cancel link.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <section className="wrap pb-24" style={{ paddingTop: "calc(var(--header-h) + 24px)" }}>
      <h1 className="text-[clamp(2.6rem,6vw,4.4rem)]">Book a table</h1>
      <p className="mt-4 max-w-[56ch] text-[1.1rem]">Three taps: how many, which time, confirm. You get a confirmation email with a link to cancel.</p>
      <div className="mt-8 max-w-[600px] rounded-[28px] bg-ticket" style={{ boxShadow: "var(--lift)" }}>
        <div className="pt-6">
          <BookPageFlow />
        </div>
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Book a table", path: "/book" },
        ])}
      />
    </section>
  );
}
