import "dotenv/config";
import { createDb } from "../lib/db";
import { createBookingCore } from "../lib/booking/create";
import { addDays, dayOfWeek, localDate } from "../lib/time";
import { seedBase } from "./seed-lib";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDb(url);
  try {
    await seedBase(db);

    if ((await db.booking.count()) === 0) {
      const today = localDate(new Date(), "Europe/London");
      // Skip Mondays (closed): offsets are counted in open days.
      const openDay = (n: number) => {
        let d = today;
        let left = n;
        while (left > 0) {
          d = addDays(d, 1);
          if (dayOfWeek(d) !== 1) left--;
        }
        return d;
      };
      const samples = [
        { day: 1, time: "19:00", party: 2, name: "Priya Shah" },
        { day: 1, time: "19:30", party: 4, name: "Tom Hargreaves" },
        { day: 1, time: "20:00", party: 6, name: "Marta Kowalska" },
        { day: 2, time: "13:00", party: 3, name: "Ben Okafor" },
        { day: 2, time: "19:15", party: 2, name: "Alice Brennan" },
        { day: 3, time: "18:45", party: 8, name: "Chen family" },
      ];
      for (const [i, s] of samples.entries()) {
        const res = await createBookingCore(db, {
          date: openDay(s.day),
          time: s.time,
          partySize: s.party,
          guestName: s.name,
          email: `guest${i + 1}@example.com`,
          phone: "07700 900123",
          source: "PHONE",
          online: false,
        });
        if (!res.ok) console.warn(`Sample booking skipped (${s.name}): ${res.error}`);
      }
    }
    console.log("Seed complete: settings, 12 tables, 2 combos, hours, 28 menu items, sample bookings.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
