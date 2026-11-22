import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createDb } from "@/lib/db";
import { createBookingCore, isExclusionViolation } from "@/lib/booking/create";
import { cancelBookingWithToken, findBookingByToken } from "@/lib/booking/cancel";
import { loadBusy } from "@/lib/booking/data";
import { rateLimit } from "@/lib/rate-limit";
import { addDays, localDate } from "@/lib/time";

const url = process.env.TEST_DATABASE_URL;
const d = describe.skipIf(!url);

let db: PrismaClient;
const now = new Date();
const date = addDays(localDate(now, "Europe/London"), 5);

async function reset(tables: { label: string; min: number; max: number }[]) {
  await db.$executeRawUnsafe(
    `TRUNCATE "BookingTable","Booking","TableCombo","DiningTable","ServicePeriod","SpecialDay","Settings","RateLimit" CASCADE`,
  );
  await db.settings.create({
    data: {
      id: 1,
      name: "Olmo",
      phone: "0117 496 0123",
      email: "hello@olmo.example",
      address: { line1: "18 Pip Lane", city: "Bristol", postcode: "BS1 5QT" },
      durations: [
        { maxParty: 2, minutes: 90 },
        { maxParty: 4, minutes: 105 },
        { maxParty: 8, minutes: 150 },
      ],
    },
  });
  for (let dow = 0; dow < 7; dow++) {
    await db.servicePeriod.create({
      data: { dayOfWeek: dow, name: "Dinner", opensAt: "17:00", lastSeating: "21:00", closesAt: "23:00" },
    });
  }
  for (const t of tables) {
    await db.diningTable.create({ data: { label: t.label, minSeats: t.min, maxSeats: t.max } });
  }
}

const guest = (i: number) => ({
  date,
  time: "19:00",
  partySize: 2,
  guestName: `Guest ${i}`,
  email: `guest${i}@example.com`,
  phone: "07700 900123",
});

d("booking engine against Postgres", () => {
  beforeAll(() => {
    db = createDb(url!);
  });
  afterAll(async () => {
    await db?.$disconnect();
  });

  describe("the no_overlap exclusion constraint", () => {
    beforeEach(() => reset([{ label: "T1", min: 1, max: 2 }]));

    it("rejects an overlapping hold on the same table even when written directly", async () => {
      const table = await db.diningTable.findFirstOrThrow();
      const mk = async (n: string) =>
        db.booking.create({
          data: {
            ref: `OLM-T${n}`,
            startsAt: new Date("2030-01-01T18:00:00Z"),
            endsAt: new Date("2030-01-01T19:30:00Z"),
            partySize: 2,
            guestName: "x",
            email: `${n}@x.com`,
            phone: "1",
            cancelTokenHash: "00",
          },
        });
      const a = await mk("AAA");
      const b = await mk("BBB");
      await db.$executeRaw`INSERT INTO "BookingTable" ("bookingId","tableId","during") VALUES (${a.id}, ${table.id}, tstzrange('2030-01-01T18:00Z'::timestamptz, '2030-01-01T19:30Z'::timestamptz, '[)'))`;
      let caught: unknown;
      try {
        await db.$executeRaw`INSERT INTO "BookingTable" ("bookingId","tableId","during") VALUES (${b.id}, ${table.id}, tstzrange('2030-01-01T19:00Z'::timestamptz, '2030-01-01T20:30Z'::timestamptz, '[)'))`;
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect(isExclusionViolation(caught)).toBe(true);
      // back-to-back is fine
      await db.$executeRaw`INSERT INTO "BookingTable" ("bookingId","tableId","during") VALUES (${b.id}, ${table.id}, tstzrange('2030-01-01T19:30Z'::timestamptz, '2030-01-01T21:00Z'::timestamptz, '[)'))`;
    });
  });

  describe("createBooking", () => {
    beforeEach(() => reset([{ label: "T1", min: 1, max: 2 }]));

    it("creates a booking with a ref and a hashed token", async () => {
      const res = await createBookingCore(db, guest(1), now);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.booking.ref).toMatch(/^OLM-[A-Z2-9]{4}$/);
      const row = await db.booking.findUniqueOrThrow({ where: { ref: res.booking.ref } });
      expect(row.cancelTokenHash).not.toBe(res.token);
      expect(row.cancelTokenHash).toHaveLength(64);
      expect(res.booking.tableLabels).toEqual(["T1"]);
    });

    it("20 parallel requests for the last free table: exactly 1 wins, 19 get SLOT_TAKEN", async () => {
      const results = await Promise.all(Array.from({ length: 20 }, (_, i) => createBookingCore(db, guest(i), now)));
      const wins = results.filter((r) => r.ok);
      const taken = results.filter((r) => !r.ok && r.error === "SLOT_TAKEN");
      expect(wins).toHaveLength(1);
      expect(taken).toHaveLength(19);
      expect(await db.booking.count()).toBe(1);
      expect(await db.bookingTable.count()).toBe(1);
    });

    it("offers nearby times when the slot is taken", async () => {
      await createBookingCore(db, guest(1), now);
      const res = await createBookingCore(db, { ...guest(2), time: "19:30" }, now);
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toBe("SLOT_TAKEN");
      // 19:30 overlaps the 19:00-20:30 booking; 17:00-18:30 and 20:30 onwards still work
      expect(res.alternatives).toContain("20:30");
      expect(res.alternatives).not.toContain("19:00");
    });

    it("refuses the same guest booking the same time twice", async () => {
      expect((await createBookingCore(db, guest(1), now)).ok).toBe(true);
      const again = await createBookingCore(db, guest(1), now);
      expect(again.ok === false && again.error).toBe("ALREADY_BOOKED");
    });

    it("enforces the rules server-side", async () => {
      const farAway = await createBookingCore(db, { ...guest(1), date: addDays(date, 60) }, now);
      expect(farAway.ok === false && farAway.error).toBe("OUTSIDE_WINDOW");
      const big = await createBookingCore(db, { ...guest(1), partySize: 9 }, now);
      expect(big.ok === false && big.error).toBe("PARTY_TOO_LARGE");
      const off = await createBookingCore(db, { ...guest(1), time: "19:10" }, now);
      expect(off.ok === false && off.error).toBe("NOT_OFFERED");
    });
  });

  describe("table assignment and combos", () => {
    beforeEach(() => reset([
      { label: "T1", min: 1, max: 2 },
      { label: "T2", min: 2, max: 4 },
      { label: "T3", min: 2, max: 4 },
    ]));

    it("puts a couple on the small table, leaving the big one free", async () => {
      const res = await createBookingCore(db, guest(1), now);
      expect(res.ok && res.booking.tableLabels).toEqual(["T1"]);
      const res2 = await createBookingCore(db, guest(2), now);
      expect(res2.ok && res2.booking.tableLabels).toEqual(["T2"]);
    });

    it("pushes two tables together for a party of 8", async () => {
      const [t2, t3] = await Promise.all([
        db.diningTable.findUniqueOrThrow({ where: { label: "T2" } }),
        db.diningTable.findUniqueOrThrow({ where: { label: "T3" } }),
      ]);
      await db.tableCombo.create({ data: { label: "T2 + T3", tableIds: [t2.id, t3.id], minSeats: 5, maxSeats: 8 } });
      const res = await createBookingCore(db, { ...guest(1), partySize: 8 }, now);
      expect(res.ok && res.booking.tableLabels.sort()).toEqual(["T2", "T3"]);
      // both tables are now held, so a party of 3 cannot be seated at that time
      const blocked = await createBookingCore(db, { ...guest(2), partySize: 3 }, now);
      expect(blocked.ok === false && blocked.error).toBe("SLOT_TAKEN");
    });
  });

  describe("cancel", () => {
    beforeEach(() => reset([{ label: "T1", min: 1, max: 2 }]));

    it("needs the right token, then frees the table in the same transaction", async () => {
      const res = await createBookingCore(db, guest(1), now);
      if (!res.ok) throw new Error("setup failed");
      const { ref } = res.booking;

      expect(await findBookingByToken(db, ref, "wrong-token")).toBeNull();
      expect((await cancelBookingWithToken(db, ref, "wrong-token", now)).ok).toBe(false);
      expect(await db.bookingTable.count()).toBe(1);

      const cancelled = await cancelBookingWithToken(db, ref, res.token, now);
      expect(cancelled.ok).toBe(true);
      expect(await db.bookingTable.count()).toBe(0);
      const row = await db.booking.findUniqueOrThrow({ where: { ref } });
      expect(row.status).toBe("CANCELLED");
      expect(row.cancelledAt).not.toBeNull();

      const again = await cancelBookingWithToken(db, ref, res.token, now);
      expect(again).toEqual({ ok: false, error: "ALREADY_CANCELLED" });

      // the slot can be booked again
      const rebook = await createBookingCore(db, guest(2), now);
      expect(rebook.ok).toBe(true);
    });

    it("cannot cancel once the booking has started", async () => {
      const res = await createBookingCore(db, guest(1), now);
      if (!res.ok) throw new Error("setup failed");
      const later = new Date(res.booking.startsAt.getTime() + 60_000);
      const r = await cancelBookingWithToken(db, res.booking.ref, res.token, later);
      expect(r).toEqual({ ok: false, error: "TOO_LATE" });
    });
  });

  describe("busy ranges and rate limiting", () => {
    beforeEach(() => reset([{ label: "T1", min: 1, max: 2 }]));

    it("loadBusy returns the held ranges", async () => {
      const res = await createBookingCore(db, guest(1), now);
      if (!res.ok) throw new Error("setup failed");
      const busy = await loadBusy(db, new Date(res.booking.startsAt.getTime() - 3_600_000), new Date(res.booking.endsAt.getTime() + 3_600_000));
      expect(busy).toHaveLength(1);
      expect(busy[0].start.getTime()).toBe(res.booking.startsAt.getTime());
    });

    it("allows N hits per window, then blocks", async () => {
      const results = [];
      for (let i = 0; i < 7; i++) results.push(await rateLimit(db, "ip:1.2.3.4", 5, 3600));
      expect(results).toEqual([true, true, true, true, true, false, false]);
      expect(await rateLimit(db, "ip:9.9.9.9", 5, 3600)).toBe(true);
    });
  });
});
