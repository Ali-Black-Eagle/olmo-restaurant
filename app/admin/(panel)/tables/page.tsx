import { TablesEditor } from "@/components/admin/tables-editor";
import { db } from "@/lib/db";

export const metadata = { title: "Tables" };

export default async function TablesPage() {
  const [tables, combos] = await Promise.all([db.diningTable.findMany(), db.tableCombo.findMany()]);
  tables.sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true }));
  return (
    <>
      <h1 className="mb-6 text-[2.2rem]">Tables</h1>
      <TablesEditor
        tables={tables.map((t) => ({ id: t.id, label: t.label, minSeats: t.minSeats, maxSeats: t.maxSeats, zone: t.zone ?? "", active: t.active }))}
        combos={combos.map((c) => ({ id: c.id, label: c.label, tableIds: c.tableIds, minSeats: c.minSeats, maxSeats: c.maxSeats }))}
      />
    </>
  );
}
