"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveSettings } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Notice, useRun } from "./use-run";

export type SettingsValues = {
  name: string;
  phone: string;
  email: string;
  priceRange: string;
  cuisine: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  bookingWindowDays: number;
  minNoticeMin: number;
  maxPartyOnline: number;
  slotIntervalMin: number;
  durations: { maxParty: number; minutes: number }[];
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const { run, pending, feedback } = useRun();
  const [durations, setDurations] = useState(initial.durations);

  return (
    <form
      className="grid max-w-[760px] gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const g = (k: string) => String(f.get(k) ?? "");
        run(() =>
          saveSettings({
            name: g("name"),
            phone: g("phone"),
            email: g("email"),
            priceRange: g("priceRange"),
            cuisine: g("cuisine"),
            line1: g("line1"),
            line2: g("line2"),
            city: g("city"),
            postcode: g("postcode"),
            lat: Number(g("lat")),
            lng: Number(g("lng")),
            bookingWindowDays: Number(g("bookingWindowDays")),
            minNoticeMin: Number(g("minNoticeMin")),
            maxPartyOnline: Number(g("maxPartyOnline")),
            slotIntervalMin: Number(g("slotIntervalMin")),
            durations,
          }),
        );
      }}
    >
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-2xl">Restaurant details</legend>
        <p className="admin-muted -mt-1 max-w-[60ch]">One source for the footer, Visit page, emails and Google structured data, so name, address and phone always match.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="name" label="Name" v={initial.name} />
          <F id="cuisine" label="Cuisine" v={initial.cuisine} />
          <F id="phone" label="Phone" v={initial.phone} type="tel" />
          <F id="email" label="Email" v={initial.email} type="email" />
          <F id="priceRange" label="Price range" v={initial.priceRange} />
          <F id="line1" label="Address line 1" v={initial.line1} />
          <F id="line2" label="Address line 2" v={initial.line2} required={false} />
          <F id="city" label="City" v={initial.city} />
          <F id="postcode" label="Postcode" v={initial.postcode} />
          <F id="lat" label="Latitude" v={String(initial.lat)} type="number" step="any" />
          <F id="lng" label="Longitude" v={String(initial.lng)} type="number" step="any" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-3 text-2xl">Online booking rules</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="bookingWindowDays" label="Book up to (days ahead)" v={String(initial.bookingWindowDays)} type="number" />
          <F id="minNoticeMin" label="Minimum notice (minutes)" v={String(initial.minNoticeMin)} type="number" />
          <F id="maxPartyOnline" label="Largest party online" v={String(initial.maxPartyOnline)} type="number" />
          <div className="field">
            <label htmlFor="slotIntervalMin">Time slots every</label>
            <select id="slotIntervalMin" name="slotIntervalMin" className="input" defaultValue={String(initial.slotIntervalMin)}>
              {[10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-3 text-2xl">How long a table is held</legend>
        <p className="admin-muted -mt-1">The longest party in each row. Larger parties use the last row.</p>
        {durations.map((d, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="field w-[140px]">
              <label htmlFor={`dp-${i}`}>Up to (guests)</label>
              <input id={`dp-${i}`} type="number" min={1} className="input" value={d.maxParty} onChange={(e) => setDurations((ds) => ds.map((x, j) => (j === i ? { ...x, maxParty: Number(e.target.value) } : x)))} />
            </div>
            <div className="field w-[140px]">
              <label htmlFor={`dm-${i}`}>Minutes</label>
              <input id={`dm-${i}`} type="number" min={30} step={5} className="input" value={d.minutes} onChange={(e) => setDurations((ds) => ds.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) } : x)))} />
            </div>
            <button type="button" className="inline-flex size-12 items-center justify-center rounded-full" aria-label={`Remove row ${i + 1}`} disabled={durations.length === 1} onClick={() => setDurations((ds) => ds.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden="true" size={20} />
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="chip" onClick={() => setDurations((ds) => [...ds, { maxParty: (ds.at(-1)?.maxParty ?? 8) + 2, minutes: 150 }])}>
            <Plus aria-hidden="true" size={16} /> Add row
          </button>
        </div>
      </fieldset>

      <div className="grid gap-3">
        <Notice feedback={feedback} />
        <div>
          <Button type="submit" loading={pending}>
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

function F({ id, label, v, type = "text", step, required = true }: { id: string; label: string; v: string; type?: string; step?: string; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type={type} step={step} required={required} defaultValue={v} className="input" />
    </div>
  );
}
