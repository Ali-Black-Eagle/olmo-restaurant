"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Reorder } from "motion/react";
import { GripVertical, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteMenuItem,
  deleteMenuSection,
  reorderMenuItems,
  saveMenuItem,
  saveMenuSection,
  toggleMenuItemAvailable,
  uploadMenuImage,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { ALLERGENS, DIETARY } from "@/lib/allergens";
import { formatGBP } from "@/lib/time";
import type { Allergen, Dietary } from "@/prisma/seed-data";
import { Notice, useRun } from "./use-run";

export type AdminItem = {
  id: string;
  sectionId: string;
  name: string;
  description: string;
  pricePence: number;
  imageUrl: string | null;
  allergens: Allergen[];
  dietary: Dietary[];
  available: boolean;
};
export type AdminSection = { id: string; name: string; items: AdminItem[] };

export function MenuEditor({ sections }: { sections: AdminSection[] }) {
  const [editing, setEditing] = useState<{ item: AdminItem | null; sectionId: string } | null>(null);
  const sectionRun = useRun();

  return (
    <div className="grid gap-10">
      {sections.map((s) => (
        <SectionBlock key={s.id} section={s} onEdit={(item) => setEditing({ item, sectionId: s.id })} />
      ))}

      <form
        className="panel flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = String(new FormData(form).get("name") ?? "");
          sectionRun.run(() => saveMenuSection({ name }), (r) => r.ok && form.reset());
        }}
      >
        <div className="field min-w-[220px] flex-1">
          <label htmlFor="new-section">New section</label>
          <input id="new-section" name="name" required maxLength={40} className="input" placeholder="Cheese" />
        </div>
        <Button type="submit" size="sm" loading={sectionRun.pending}>
          Add section
        </Button>
        <Notice feedback={sectionRun.feedback} />
      </form>

      <Dialog.Root open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[140] bg-char/60" />
          <Dialog.Content aria-describedby={undefined} className="admin fixed inset-y-0 right-0 z-[150] w-[min(100vw,520px)] overflow-y-auto border-l p-6 outline-none admin-line" style={{ minHeight: "auto" }}>
            {editing ? <ItemForm key={editing.item?.id ?? "new"} item={editing.item} sectionId={editing.sectionId} sections={sections} onDone={() => setEditing(null)} /> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SectionBlock({ section, onEdit }: { section: AdminSection; onEdit: (item: AdminItem | null) => void }) {
  const [items, setItems] = useState(section.items);
  const [name, setName] = useState(section.name);
  const { run, pending, feedback } = useRun();
  useEffect(() => setItems(section.items), [section.items]);

  return (
    <section aria-labelledby={`sec-${section.id}`}>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="field">
          <label htmlFor={`sec-${section.id}`} className="visually-hidden">
            Section name
          </label>
          <input id={`sec-${section.id}`} className="input font-display !text-2xl" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== section.name && run(() => saveMenuSection({ id: section.id, name }))} />
        </div>
        <Button variant="secondary" size="sm" onClick={() => onEdit(null)}>
          <Plus aria-hidden="true" size={16} /> Add dish
        </Button>
        <Button variant="secondary" size="sm" disabled={section.items.length > 0 || pending} onClick={() => run(() => deleteMenuSection(section.id))}>
          Delete section
        </Button>
      </div>
      <Notice feedback={feedback} />
      <p className="admin-muted mb-2 text-sm">Drag the handle to reorder. The public menu follows this order.</p>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="grid gap-2">
        {items.map((item) => (
          <Reorder.Item key={item.id} value={item} className="panel flex items-center gap-3 px-3 py-2" onDragEnd={() => run(() => reorderMenuItems(section.id, items.map((i) => i.id)))} style={{ opacity: item.available ? 1 : 0.6 }}>
            <span className="cursor-grab touch-none p-2" aria-hidden="true">
              <GripVertical size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.name}</p>
              <p className="admin-muted text-sm">{formatGBP(item.pricePence)}{item.available ? "" : ", sold out"}</p>
            </div>
            <button
              type="button"
              className="chip"
              aria-pressed={!item.available}
              onClick={() => run(() => toggleMenuItemAvailable(item.id, !item.available))}
              title="Hide from the public menu when the kitchen runs out"
            >
              Sold out
            </button>
            <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>
              Edit
            </Button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
  );
}

function ItemForm({ item, sectionId, sections, onDone }: { item: AdminItem | null; sectionId: string; sections: AdminSection[]; onDone: () => void }) {
  const { run, pending, feedback } = useRun();
  const [allergens, setAllergens] = useState<Allergen[]>(item?.allergens ?? []);
  const [dietary, setDietary] = useState<Dietary[]>(item?.dietary ?? []);
  const [available, setAvailable] = useState(item?.available ?? true);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [upload, setUpload] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUpload(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await uploadMenuImage(fd);
      if (res.ok) {
        setImageUrl(res.url);
        setUpload("Uploaded.");
      } else setUpload(res.message);
    } catch {
      setUpload("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <Dialog.Title className="text-[1.8rem]">{item ? "Edit dish" : "Add dish"}</Dialog.Title>
        <Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full" aria-label="Close">
          <X aria-hidden="true" size={22} />
        </Dialog.Close>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(
            () =>
              saveMenuItem({
                id: item?.id,
                sectionId: String(f.get("sectionId")),
                name: String(f.get("name")),
                description: String(f.get("description")),
                price: Number(f.get("price")),
                imageUrl,
                allergens,
                dietary,
                available,
              }),
            (r) => r.ok && onDone(),
          );
        }}
      >
        <div className="field">
          <label htmlFor="i-name">Name</label>
          <input id="i-name" name="name" required className="input" defaultValue={item?.name} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="i-desc">Description</label>
          <textarea id="i-desc" name="description" required className="input" defaultValue={item?.description} maxLength={240} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field">
            <label htmlFor="i-price">Price (GBP)</label>
            <input id="i-price" name="price" type="number" step="0.01" min="0" required className="input" defaultValue={item ? (item.pricePence / 100).toFixed(2) : ""} inputMode="decimal" />
          </div>
          <div className="field">
            <label htmlFor="i-section">Section</label>
            <select id="i-section" name="sectionId" className="input" defaultValue={item?.sectionId ?? sectionId}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="i-image">Photo link or path</label>
          <input id="i-image" className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/images/plate-salmon.jpg or https://..." />
          <label htmlFor="i-file" className="mt-2 text-sm font-normal">Or upload a photo (needs Vercel Blob)</label>
          <input id="i-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFile} disabled={uploading} className="min-h-11 text-sm" />
          {upload ? <p className="hint" role="status">{upload}</p> : null}
        </div>
        <fieldset>
          <legend className="field-label mb-2">Dietary</legend>
          <div className="flex flex-wrap gap-2">
            {DIETARY.map((d) => (
              <button key={d.id} type="button" role="checkbox" aria-checked={dietary.includes(d.id)} className="chip" onClick={() => setDietary((l) => toggle(l, d.id))}>
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="field-label mb-2">Contains allergens</legend>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <button key={a.id} type="button" role="checkbox" aria-checked={allergens.includes(a.id)} className="chip" onClick={() => setAllergens((l) => toggle(l, a.id))}>
                {a.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-5 accent-[var(--saffron)]" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          Available (untick when sold out)
        </label>
        <Notice feedback={feedback} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={pending}>
            Save dish
          </Button>
          {item ? (
            <Button variant="danger" onClick={() => run(() => deleteMenuItem(item.id), (r) => r.ok && onDone())}>
              Delete dish
            </Button>
          ) : null}
        </div>
      </form>
    </>
  );
}
