"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteSpecialDay, saveSpecialDay, saveWeeklyHours } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, formatClock, formatDateLong } from "@/lib/time";
import { Notice, useRun } from "./use-run";

export type PeriodRow = { name: string; opensAt: string; lastSeating: string; closesAt: string };
export type SpecialRow = { id: string; date: string; closed: boolean; note: string | null; periods: PeriodRow[] | null };

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULTS: Record<string, PeriodRow> = {
  Lunch: { name: "Lunch", opensAt: "12:00", lastSeating: "14:30", closesAt: "16:00" },
  Dinner: { name: "Dinner", opensAt: "17:30", lastSeating: "21:00", closesAt: "23:00" },
};

function PeriodFields({ p, onChange, onRemove, label }: { p: PeriodRow; onChange: (p: PeriodRow) => void; onRemove: () => void; label: string }) {
  const set = (k: keyof PeriodRow) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...p, [k]: e.target.value });
  return (
    <div className="flex flex-wrap items-end gap-3" role="group" aria-label={label}>
      <div className="field w-[110px]">
        <label>Service</label>
        <input className="input" value={p.name} onChange={set("name")} maxLength={20} aria-label={`${label} name`} />
      </div>
      <div className="field">
        <label>Opens</label>
        <input type="time" className="input" value={p.opensAt} onChange={set("opensAt")} step={900} aria-label={`${label} opens`} />
      </div>
      <div className="field">
        <label>Last seating</label>
        <input type="time" className="input" value={p.lastSeating} onChange={set("lastSeating")} step={900} aria-label={`${label} last seating`} />
      </div>
      <div className="field">
        <label>Closes</label>
        <input type="time" className="input" value={p.closesAt} onChange={set("closesAt")} step={900} aria-label={`${label} closes`} />
      </div>
      <button type="button" className="inline-flex size-12 items-center justify-center rounded-full" onClick={onRemove} aria-label={`Remove ${label}`}>
        <Trash2 aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

export function HoursEditor({ weekly, special }: { weekly: Record<number, PeriodRow[]>; special: SpecialRow[] }) {
  const [days, setDays] = useState<Record<number, PeriodRow[]>>(weekly);
  const { run, pending, feedback } = useRun();

  const update = (dow: number, idx: number, p: PeriodRow) => setDays((d) => ({ ...d, [dow]: (d[dow] ?? []).map((x, i) => (i === idx ? p : x)) }));
  const remove = (dow: number, idx: number) => setDays((d) => ({ ...d, [dow]: (d[dow] ?? []).filter((_, i) => i !== idx) }));
  const add = (dow: number, kind: "Lunch" | "Dinner") => setDays((d) => ({ ...d, [dow]: [...(d[dow] ?? []), { ...DEFAULTS[kind] }] }));

  return (
    <div className="grid gap-12">
      <section aria-labelledby="weekly-h">
        <h2 id="weekly-h" className="mb-1 text-2xl">Weekly hours</h2>
        <p className="admin-muted mb-4 max-w-[64ch]">Guests can book from the opening time to the last seating. A day with no service is closed. Changes apply to availability and the public site at once.</p>
        <div className="grid gap-3">
          {ORDER.map((dow) => (
            <fieldset key={dow} className="panel p-4">
              <legend className="px-2 font-semibold">{DAY_NAMES[dow]}</legend>
              <div className="grid gap-3">
                {(days[dow] ?? []).length === 0 ? <p className="admin-muted">Closed</p> : null}
                {(days[dow] ?? []).map((p, i) => (
                  <PeriodFields key={i} p={p} label={`${DAY_NAMES[dow]} ${p.name || "service"} ${i + 1}`} onChange={(np) => update(dow, i, np)} onRemove={() => remove(dow, i)} />
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="chip" onClick={() => add(dow, "Lunch")}>
                    <Plus aria-hidden="true" size={16} /> Lunch
                  </button>
                  <button type="button" className="chip" onClick={() => add(dow, "Dinner")}>
                    <Plus aria-hidden="true" size={16} /> Dinner
                  </button>
                </div>
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <Notice feedback={feedback} />
          <div>
            <Button
              loading={pending}
              onClick={() => run(() => saveWeeklyHours(Object.entries(days).flatMap(([dow, ps]) => ps.map((p) => ({ dayOfWeek: Number(dow), ...p })))))}
            >
              Save weekly hours
            </Button>
          </div>
        </div>
      </section>

      <SpecialDays special={special} />
    </div>
  );
}

function SpecialDays({ special }: { special: SpecialRow[] }) {
  const { run, pending, feedback } = useRun();
  const [mode, setMode] = useState<"closed" | "custom">("closed");
  const [periods, setPeriods] = useState<PeriodRow[]>([{ ...DEFAULTS.Dinner }]);

  return (
    <section aria-labelledby="special-h">
      <h2 id="special-h" className="mb-1 text-2xl">Special days</h2>
      <p className="admin-muted mb-4 max-w-[64ch]">Close a day, or give it different hours. A special day replaces the weekly pattern for that date.</p>

      {special.length > 0 ? (
        <ul className="mb-6 grid gap-2">
          {special.map((s) => (
            <li key={s.id} className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">{formatDateLong(s.date)}</p>
                <p className="admin-muted text-sm">
                  {s.closed ? "Closed" : s.periods?.map((p) => `${p.name} ${formatClock(p.opensAt)} to ${formatClock(p.closesAt)}`).join(", ") ?? "Usual hours"}
                  {s.note ? `. ${s.note}` : ""}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => run(() => deleteSpecialDay(s.id))} disabled={pending}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-muted mb-6">No special days coming up.</p>
      )}

      <form
        className="panel grid gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() =>
            saveSpecialDay({
              date: String(f.get("date") ?? ""),
              closed: mode === "closed",
              note: String(f.get("note") ?? ""),
              periods: mode === "custom" ? periods : undefined,
            }),
          );
        }}
      >
        <h3 className="font-sans text-base font-semibold">Add or change a special day</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="field">
            <label htmlFor="sp-date">Date</label>
            <input id="sp-date" name="date" type="date" required className="input" />
          </div>
          <div className="field min-w-[220px] flex-1">
            <label htmlFor="sp-note">Note shown to guests (optional)</label>
            <input id="sp-note" name="note" className="input" maxLength={160} placeholder="Private hire, bank holiday" />
          </div>
        </div>
        <div role="radiogroup" aria-label="What happens on this day" className="flex flex-wrap gap-2">
          <button type="button" role="radio" aria-checked={mode === "closed"} className="chip" onClick={() => setMode("closed")}>
            Closed all day
          </button>
          <button type="button" role="radio" aria-checked={mode === "custom"} className="chip" onClick={() => setMode("custom")}>
            Custom hours
          </button>
        </div>
        {mode === "custom" ? (
          <div className="grid gap-3">
            {periods.map((p, i) => (
              <PeriodFields
                key={i}
                p={p}
                label={`Special service ${i + 1}`}
                onChange={(np) => setPeriods((ps) => ps.map((x, j) => (j === i ? np : x)))}
                onRemove={() => setPeriods((ps) => ps.filter((_, j) => j !== i))}
              />
            ))}
            <div>
              <button type="button" className="chip" onClick={() => setPeriods((ps) => [...ps, { ...DEFAULTS.Lunch }])}>
                <Plus aria-hidden="true" size={16} /> Add service
              </button>
            </div>
          </div>
        ) : null}
        <Notice feedback={feedback} />
        <div>
          <Button type="submit" loading={pending}>
            Save special day
          </Button>
        </div>
      </form>
    </section>
  );
}
