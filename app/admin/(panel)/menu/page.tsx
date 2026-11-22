import { MenuEditor } from "@/components/admin/menu-editor";
import { db } from "@/lib/db";
import type { Allergen, Dietary } from "@/prisma/seed-data";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  const sections = await db.menuSection.findMany({ orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } });
  return (
    <>
      <h1 className="mb-2 text-[2.2rem]">Menu</h1>
      <p className="admin-muted mb-8 max-w-[64ch]">Edits go live on the public menu straight away. Mark a dish sold out when the kitchen runs out, and it disappears from the public page until you bring it back.</p>
      <MenuEditor
        sections={sections.map((s) => ({
          id: s.id,
          name: s.name,
          items: s.items.map((i) => ({
            id: i.id,
            sectionId: i.sectionId,
            name: i.name,
            description: i.description,
            pricePence: i.pricePence,
            imageUrl: i.imageUrl,
            allergens: i.allergens as Allergen[],
            dietary: i.dietary as Dietary[],
            available: i.available,
          })),
        }))}
      />
    </>
  );
}
