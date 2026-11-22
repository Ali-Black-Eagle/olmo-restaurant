import type { PrismaClient } from "../generated/prisma/client";
import { combosSeed, menuSeed, periodsSeed, settingsSeed, tablesSeed } from "./seed-data";

/** Idempotent: safe to run repeatedly. Never touches existing bookings. */
export async function seedBase(db: PrismaClient) {
  await db.settings.upsert({ where: { id: 1 }, update: {}, create: settingsSeed });

  for (const t of tablesSeed) {
    await db.diningTable.upsert({ where: { label: t.label }, update: {}, create: t });
  }
  const tables = await db.diningTable.findMany();
  const idByLabel = new Map(tables.map((t) => [t.label, t.id]));

  if ((await db.tableCombo.count()) === 0) {
    for (const c of combosSeed) {
      await db.tableCombo.create({
        data: {
          label: c.label,
          tableIds: c.tables.map((l) => idByLabel.get(l)!),
          minSeats: c.minSeats,
          maxSeats: c.maxSeats,
        },
      });
    }
  }

  if ((await db.servicePeriod.count()) === 0) {
    await db.servicePeriod.createMany({ data: periodsSeed });
  }

  for (const [si, section] of menuSeed.entries()) {
    const s = await db.menuSection.upsert({
      where: { slug: section.slug },
      update: {},
      create: { slug: section.slug, name: section.name, order: si },
    });
    for (const [ii, item] of section.items.entries()) {
      await db.menuItem.upsert({
        where: { slug: item.slug },
        update: {},
        create: {
          sectionId: s.id,
          slug: item.slug,
          name: item.name,
          description: item.description,
          pricePence: item.pricePence,
          imageUrl: item.image ?? null,
          allergens: item.allergens,
          dietary: item.dietary,
          order: ii,
        },
      });
    }
  }
}
