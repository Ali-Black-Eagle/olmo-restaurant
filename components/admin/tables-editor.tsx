"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCombo, deleteTable, saveCombo, saveTable } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Notice, useRun } from "./use-run";

export type TableRow = { id: string; label: string; minSeats: number; maxSeats: number; zone: string; active: boolean };
export type ComboRow = { id: string; label: string; tableIds: string[]; minSeats: number; maxSeats: number };

function TableRowEditor({ t }: { t: TableRow }) {
  const { run, pending, feedback } = useRun();
  const [v, setV] = useState(t);
  const dirty = JSON.stringify(v) !== JSON.stringify(t);
  return (
    <li className="panel p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="field w-[84px]">
          <label htmlFor={`l-${t.id}`}>Label</label>
          <input id={`l-${t.id}`} className="input" value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />
        </div>
        <div className="field w-[84px]">
          <label htmlFor={`mn-${t.id}`}>Min seats</label>
          <input id={`mn-${t.id}`} type="number" min={1} className="input" value={v.minSeats} onChange={(e) => setV({ ...v, minSeats: Number(e.target.value) })} />
        </div>
        <div className="field w-[84px]">
          <label htmlFor={`mx-${t.id}`}>Max seats</label>
          <input id={`mx-${t.id}`} type="number" min={1} className="input" value={v.maxSeats} onChange={(e) => setV({ ...v, maxSeats: Number(e.target.value) })} />
        </div>
        <div className="field w-[150px]">
          <label htmlFor={`z-${t.id}`}>Zone</label>
          <input id={`z-${t.id}`} className="input" value={v.zone} onChange={(e) => setV({ ...v, zone: e.target.value })} />
        </div>
        <label className="flex min-h-12 items-center gap-2">
          <input type="checkbox" className="size-5 accent-[var(--saffron)]" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
          Active
        </label>
        <Button size="sm" disabled={!dirty} loading={pending} onClick={() => run(() => saveTable(v))}>
          Save
        </Button>
        <button type="button" className="inline-flex size-11 items-center justify-center rounded-full" aria-label={`Delete table ${t.label}`} onClick={() => run(() => deleteTable(t.id))}>
          <Trash2 aria-hidden="true" size={20} />
        </button>
      </div>
      <Notice feedback={feedback} />
    </li>
  );
}

export function TablesEditor({ tables, combos }: { tables: TableRow[]; combos: ComboRow[] }) {
  const add = useRun();
  const comboRun = useRun();
  const [selected, setSelected] = useState<string[]>([]);
  const labelOf = (id: string) => tables.find((t) => t.id === id)?.label ?? "?";

  return (
    <div className="grid gap-12">
      <section aria-labelledby="tables-h">
        <h2 id="tables-h" className="mb-1 text-2xl">Tables</h2>
        <p className="admin-muted mb-4 max-w-[64ch]">A party is seated at the smallest active table that fits it, so big tables stay free for big parties. Inactive tables are never offered.</p>
        <ul className="grid gap-2">
          {tables.map((t) => (
            <TableRowEditor key={t.id + JSON.stringify(t)} t={t} />
          ))}
        </ul>
        <form
          className="panel mt-4 flex flex-wrap items-end gap-3 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const form = e.currentTarget;
            add.run(
              () => saveTable({ label: String(f.get("label")), minSeats: Number(f.get("min")), maxSeats: Number(f.get("max")), zone: String(f.get("zone") ?? ""), active: true }),
              (r) => r.ok && form.reset(),
            );
          }}
        >
          <div className="field w-[84px]">
            <label htmlFor="n-label">Label</label>
            <input id="n-label" name="label" required className="input" placeholder="T13" />
          </div>
          <div className="field w-[84px]">
            <label htmlFor="n-min">Min seats</label>
            <input id="n-min" name="min" type="number" min={1} required defaultValue={1} className="input" />
          </div>
          <div className="field w-[84px]">
            <label htmlFor="n-max">Max seats</label>
            <input id="n-max" name="max" type="number" min={1} required defaultValue={2} className="input" />
          </div>
          <div className="field w-[150px]">
            <label htmlFor="n-zone">Zone</label>
            <input id="n-zone" name="zone" className="input" />
          </div>
          <Button type="submit" size="sm" loading={add.pending}>
            Add table
          </Button>
          <Notice feedback={add.feedback} />
        </form>
      </section>

      <section aria-labelledby="combos-h">
        <h2 id="combos-h" className="mb-1 text-2xl">Combinations</h2>
        <p className="admin-muted mb-4 max-w-[64ch]">Tables that can be pushed together for bigger parties. A combination holds all of its tables for the whole booking.</p>
        {combos.length === 0 ? <p className="admin-muted mb-4">No combinations yet.</p> : null}
        <ul className="mb-4 grid gap-2">
          {combos.map((c) => (
            <li key={c.id} className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p>
                <span className="font-semibold">{c.tableIds.map(labelOf).join(" + ")}</span>
                <span className="admin-muted"> seats {c.minSeats} to {c.maxSeats}</span>
              </p>
              <Button variant="secondary" size="sm" onClick={() => comboRun.run(() => deleteCombo(c.id))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="panel grid gap-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            comboRun.run(
              () => saveCombo({ tableIds: selected, minSeats: Number(f.get("min")), maxSeats: Number(f.get("max")) }),
              (r) => r.ok && setSelected([]),
            );
          }}
        >
          <h3 className="font-sans text-base font-semibold">Add a combination</h3>
          <div role="group" aria-label="Tables in the combination" className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                role="checkbox"
                aria-checked={selected.includes(t.id)}
                className="chip"
                onClick={() => setSelected((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="field w-[100px]">
              <label htmlFor="c-min">Min seats</label>
              <input id="c-min" name="min" type="number" min={1} defaultValue={5} className="input" />
            </div>
            <div className="field w-[100px]">
              <label htmlFor="c-max">Max seats</label>
              <input id="c-max" name="max" type="number" min={1} defaultValue={8} className="input" />
            </div>
            <Button type="submit" size="sm" loading={comboRun.pending}>
              Save combination
            </Button>
          </div>
          <Notice feedback={comboRun.feedback} />
        </form>
      </section>
    </div>
  );
}
