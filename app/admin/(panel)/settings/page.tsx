import { SettingsForm } from "@/components/admin/settings-form";
import { getRestaurant } from "@/lib/data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const r = await getRestaurant();
  return (
    <>
      <h1 className="mb-6 text-[2.2rem]">Settings</h1>
      <SettingsForm
        initial={{
          name: r.name,
          phone: r.phone,
          email: r.email,
          priceRange: r.priceRange,
          cuisine: r.cuisine,
          line1: r.address.line1,
          line2: r.address.line2 ?? "",
          city: r.address.city,
          postcode: r.address.postcode,
          lat: r.address.lat,
          lng: r.address.lng,
          bookingWindowDays: r.rules.bookingWindowDays,
          minNoticeMin: r.rules.minNoticeMin,
          maxPartyOnline: r.rules.maxPartyOnline,
          slotIntervalMin: r.rules.slotIntervalMin,
          durations: r.rules.durations,
        }}
      />
    </>
  );
}
