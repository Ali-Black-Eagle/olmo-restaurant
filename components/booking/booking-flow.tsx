"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBookingAction, type BookingTicket } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { addDays, dayOfWeek, formatClock, formatDateLong, formatDateShort } from "@/lib/time";
import { AutoHeight } from "./auto-height";
import { Ticket } from "./ticket";
import type { AvailabilityResponse, BookingConfig, Prefill } from "./types";

type Step = "party" | "time" | "confirm" | "done";
const STEPS: Step[] = ["party", "time", "confirm", "done"];
const STEP_TITLES: Record<Step, string> = {
  party: "How many of you?",
  time: "Pick a day and time",
  confirm: "Check and confirm",
  done: "You are booked",
};
const STORAGE_KEY = "olmo:guest";

type Guest = { name: string; email: string; phone: string };

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

function readGuest(): Guest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Guest;
    return g.name && g.email && g.phone ? g : null;
  } catch {
    return null;
  }
}
function saveGuest(g: Guest) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(g));
  } catch {}
}

export function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function stepFromUrl(): Step | null {
  const s = new URLSearchParams(window.location.search).get("step");
  return s && (STEPS as string[]).includes(s) ? (s as Step) : null;
}

function urlWithStep(step: Step | null): string {
  const u = new URL(window.location.href);
  if (step) u.searchParams.set("step", step);
  else u.searchParams.delete("step");
  return u.pathname + u.search + u.hash;
}

type Props = {
  config: BookingConfig;
  variant: "sheet" | "page";
  prefill?: Prefill;
  /** Called when a sheet should close (X, swipe, back past the first step, Done). */
  onClose?: () => void;
  /** Sheet only: ask the parent to undo the history entries this flow pushed. */
  registerCloseHandler?: (fn: () => void) => void;
};

export function BookingFlow({ config, variant, prefill, onClose, registerCloseHandler }: Props) {
  const reduce = useReducedMotion();
  const initialStep: Step = prefill?.party && prefill.date && prefill.time ? "confirm" : prefill?.party ? "time" : "party";
  const [step, setStep] = useState<Step>(initialStep);
  const [dir, setDir] = useState<1 | -1>(1);
  const [party, setParty] = useState<number | null>(prefill?.party ?? null);
  const [date, setDate] = useState<string | null>(prefill?.date ?? null);
  const [time, setTime] = useState<string | null>(prefill?.time ?? null);
  const [ticket, setTicket] = useState<BookingTicket | null>(null);
  const depth = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const stepRef = useRef(step);
  const partyRef = useRef(party);
  const dateRef = useRef(date);
  const timeRef = useRef(time);
  const ticketRef = useRef(ticket);
  useEffect(() => {
    stepRef.current = step;
    partyRef.current = party;
    dateRef.current = date;
    timeRef.current = time;
    ticketRef.current = ticket;
  });

  // ---------------------------------------------------------------- history
  const go = useCallback((next: Step, direction: 1 | -1 = 1, replace = false) => {
    setDir(direction);
    setStep(next);
    if (replace) window.history.replaceState({ olmo: true }, "", urlWithStep(next));
    else {
      window.history.pushState({ olmo: true }, "", urlWithStep(next));
      depth.current += 1;
    }
  }, []);

  useEffect(() => {
    // Record the entry step so Back returns to it (first entry replaces on the page, pushes in the sheet).
    if (variant === "sheet") {
      // Guard against React strict mode running this effect twice in dev (a doubled entry would break Back).
      if (stepFromUrl() !== initialStep) {
        window.history.pushState({ olmo: true }, "", urlWithStep(initialStep));
        depth.current = 1;
      }
    } else {
      const fromUrl = stepFromUrl();
      if (!fromUrl || fromUrl === "done") window.history.replaceState({ olmo: true }, "", urlWithStep(initialStep));
    }
    const onPop = () => {
      const s = stepFromUrl();
      if (!s) {
        depth.current = 0;
        if (variant === "sheet") onClose?.();
        else {
          setDir(-1);
          setStep("party");
        }
        return;
      }
      depth.current = Math.max(0, depth.current - 1);
      const order = STEPS.indexOf(s);
      setDir(order < STEPS.indexOf(stepRef.current) ? -1 : 1);
      // Never land on a step whose inputs are missing.
      if (s === "time" && !partyRef.current) setStep("party");
      else if (s === "confirm" && !(partyRef.current && dateRef.current && timeRef.current)) setStep(partyRef.current ? "time" : "party");
      else if (s === "done" && !ticketRef.current) setStep("party");
      else setStep(s);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    registerCloseHandler?.(() => {
      const n = depth.current;
      depth.current = 0;
      if (n > 0) window.history.go(-n);
    });
  }, [registerCloseHandler]);

  // Move focus to the step heading after the first render so keyboard and screen reader users follow along.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const back = () => {
    if (step === "time") go("party", -1, false);
    else if (step === "confirm") go("time", -1, false);
  };

  const variants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (d: number) => ({ x: d * 36, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d * -36, opacity: 0 }),
      };

  return (
    <div className="px-5 pb-6 pt-1 sm:px-7">
      <div className="mb-4 flex items-center gap-2">
        {step !== "party" && step !== "done" ? (
          <button
            type="button"
            onClick={back}
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-olive-ink/6"
            aria-label="Back"
          >
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
        ) : null}
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-[1.75rem] leading-tight outline-none">
          {STEP_TITLES[step]}
        </h2>
      </div>

      <AutoHeight>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.12 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {!config.enabled ? (
              <Unavailable phone={config.phone} />
            ) : step === "party" ? (
              <StepParty
                config={config}
                value={party}
                onPick={(n) => {
                  buzz();
                  setParty(n);
                  if (n !== party) setTime(null);
                  go("time");
                }}
              />
            ) : step === "time" && party ? (
              <StepTime
                config={config}
                party={party}
                date={date}
                time={time}
                onChangeParty={() => go("party", -1)}
                onDate={(d) => {
                  setDate(d);
                  setTime(null);
                }}
                onPick={(d, t) => {
                  buzz();
                  setDate(d);
                  setTime(t);
                  go("confirm");
                }}
              />
            ) : step === "confirm" && party && date && time ? (
              <StepConfirm
                config={config}
                party={party}
                date={date}
                time={time}
                onChangeTime={(t) => setTime(t)}
                onBooked={(t) => {
                  setTicket(t);
                  go("done", 1, true);
                }}
              />
            ) : step === "done" && ticket ? (
              <StepDone ticket={ticket} onDone={() => (variant === "sheet" ? onClose?.() : undefined)} variant={variant} />
            ) : (
              <StepParty config={config} value={party} onPick={(n) => { setParty(n); go("time"); }} />
            )}
          </motion.div>
        </AnimatePresence>
      </AutoHeight>
    </div>
  );
}

/* ------------------------------------------------------------------ steps */

function Unavailable({ phone }: { phone: string }) {
  return (
    <p className="py-4">
      Online booking is not set up on this copy of the site yet. You can still call us on{" "}
      <a className="link" href={`tel:${phone.replace(/\s/g, "")}`}>
        {phone}
      </a>
      .
    </p>
  );
}

function StepParty({ config, value, onPick }: { config: BookingConfig; value: number | null; onPick: (n: number) => void }) {
  const sizes = Array.from({ length: config.maxParty }, (_, i) => i + 1);
  return (
    <div>
      <div role="group" aria-label="Party size" className="grid grid-cols-4 gap-3">
        {sizes.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-pressed={value === n}
            aria-label={`${n} ${n === 1 ? "guest" : "guests"}`}
            className="chip aspect-square min-h-[64px] !rounded-full font-display text-3xl"
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-5 text-[15px] text-olive">
        {config.maxParty + 1} or more?{" "}
        <a className="link" href={`tel:${config.phone.replace(/\s/g, "")}`}>
          Call us on {config.phone}
        </a>
      </p>
    </div>
  );
}

function StepTime({
  config,
  party,
  date,
  time,
  onChangeParty,
  onDate,
  onPick,
}: {
  config: BookingConfig;
  party: number;
  date: string | null;
  time: string | null;
  onChangeParty: () => void;
  onDate: (d: string) => void;
  onPick: (d: string, t: string) => void;
}) {
  const [today, setToday] = useState<string | null>(null);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => setToday(todayIn(config.timezone)), [config.timezone]);

  const isOpenDay = useCallback(
    (d: string) => config.openDows.includes(dayOfWeek(d)) && !config.closedDates.includes(d),
    [config.openDows, config.closedDates],
  );

  const days = useMemo(() => (today ? Array.from({ length: config.windowDays + 1 }, (_, i) => addDays(today, i)) : []), [today, config.windowDays]);

  // Pre-select today (or the next open day).
  useEffect(() => {
    if (!today || date) return;
    const firstOpen = days.find(isOpenDay) ?? today;
    onDate(firstOpen);
  }, [today, date, days, isOpenDay, onDate]);

  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    setState("loading");
    setData(null);
    fetch(`/api/availability?date=${date}&party=${party}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<AvailabilityResponse>;
      })
      .then((d) => {
        setData(d);
        setState("idle");
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setState("error");
      });
    return () => ctrl.abort();
  }, [date, party]);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  }, [days.length, date]);

  const anyFree = data?.periods.some((p) => p.slots.some((s) => s.available));

  return (
    <div>
      <p className="mb-4 text-[15px]">
        Table for <strong>{party}</strong>.{" "}
        <button type="button" className="link" onClick={onChangeParty}>
          Change
        </button>
      </p>

      <div
        ref={stripRef}
        role="group"
        aria-label="Choose a date"
        className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 sm:-mx-7 sm:px-7"
      >
        {!today
          ? Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton h-[72px] w-[60px] shrink-0 !rounded-[18px]" />)
          : days.map((d) => {
              const s = formatDateShort(d);
              const open = isOpenDay(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={date === d}
                  aria-disabled={!open || undefined}
                  tabIndex={open ? 0 : -1}
                  aria-label={`${formatDateLong(d)}${open ? "" : ", closed"}`}
                  onClick={() => open && onDate(d)}
                  className="chip !flex-col !gap-0 !rounded-[18px] !px-3 !py-2 shrink-0 leading-tight"
                  style={{ minWidth: 60, minHeight: 72 }}
                >
                  <span className="text-xs">{d === today ? "Today" : s.weekday}</span>
                  <span className="font-display text-2xl leading-none">{s.day}</span>
                  <span className="text-xs">{s.month}</span>
                </button>
              );
            })}
      </div>

      <div aria-live="polite" className="mt-3 min-h-[160px]">
        {state === "loading" || (!data && state !== "error") ? (
          <div aria-label="Loading times" role="status" className="grid gap-4">
            <div className="skeleton h-5 w-16" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skeleton h-11 w-[84px]" />
              ))}
            </div>
          </div>
        ) : state === "error" ? (
          <p className="error-text">
            <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            We could not load times. Check your connection and pick the date again, or call {config.phone}.
          </p>
        ) : data?.closed ? (
          <p>
            We are closed on {date ? formatDateLong(date) : "that day"}
            {data.note ? `: ${data.note}` : ""}. Pick another day.
          </p>
        ) : !anyFree ? (
          <p>
            Nothing is free for {party} on {date ? formatDateLong(date) : "that day"}. Try another day, or call us on {config.phone}.
          </p>
        ) : (
          <div className="grid gap-5">
            {data?.periods.map((p) => (
              <div key={p.name} role="group" aria-label={p.name}>
                <h3 className="mb-2 font-sans text-[15px] font-semibold tracking-normal">{p.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {p.slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      aria-pressed={time === s.time}
                      aria-disabled={!s.available || undefined}
                      tabIndex={s.available ? 0 : -1}
                      aria-label={`${formatClock(s.time)}${s.available ? "" : ", not available"}`}
                      onClick={() => s.available && date && onPick(date, s.time)}
                      className="chip"
                    >
                      {formatClock(s.time)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepConfirm({
  config,
  party,
  date,
  time,
  onChangeTime,
  onBooked,
}: {
  config: BookingConfig;
  party: number;
  date: string;
  time: string;
  onChangeTime: (t: string) => void;
  onBooked: (t: BookingTicket) => void;
}) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; alternatives?: string[] } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const g = readGuest();
    setGuest(g);
    setEditing(!g);
    setReady(true);
  }, []);

  async function submit(values: Guest & { note?: string; website?: string }) {
    setBusy(true);
    setProblem(null);
    setFieldErrors({});
    try {
      const res = await createBookingAction({ date, time, partySize: party, guestName: values.name, email: values.email, phone: values.phone, note: values.note, website: values.website });
      if (res.ok) {
        saveGuest({ name: values.name ?? "", email: values.email, phone: values.phone });
        onBooked(res.ticket);
        return;
      }
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
        setEditing(true);
      }
      if (res.error === "SLOT_TAKEN") {
        setProblem({ message: `${formatClock(time)} was just booked. Here are the nearest times:`, alternatives: res.alternatives });
      } else if (res.error !== "INVALID") {
        setProblem({ message: res.message, alternatives: res.alternatives });
      } else {
        setProblem({ message: res.message });
      }
    } catch {
      setProblem({ message: `Something went wrong sending your booking. Try again, or call us on ${config.phone}.` });
    } finally {
      setBusy(false);
    }
  }

  const summary = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-[10px] border border-olive/30 bg-ticket p-4 text-[16px]">
      <dt className="text-olive">Date</dt>
      <dd className="font-semibold">{formatDateLong(date)}</dd>
      <dt className="text-olive">Time</dt>
      <dd className="font-semibold">{formatClock(time)}</dd>
      <dt className="text-olive">Party</dt>
      <dd className="font-semibold">
        {party} {party === 1 ? "guest" : "guests"}
      </dd>
    </dl>
  );

  const problemBlock = problem ? (
    <div role="alert" className="mt-4">
      <p className="error-text">
        <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <span>{problem.message}</span>
      </p>
      {problem.alternatives && problem.alternatives.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {problem.alternatives.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => {
                onChangeTime(t);
                setProblem(null);
              }}
            >
              {formatClock(t)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  if (!ready) return <div className="skeleton h-40 w-full !rounded-[10px]" />;

  if (guest && !editing) {
    return (
      <div>
        {summary}
        <p className="mt-4 text-[16px]">
          Booking as <strong>{guest.name}</strong> ({guest.email}).{" "}
          <button type="button" className="link" onClick={() => setEditing(true)}>
            Change details
          </button>
        </p>
        {problemBlock}
        <Button className="mt-5 w-full" loading={busy} onClick={() => submit(guest)}>
          Confirm booking
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        const values = { name: get("name"), email: get("email"), phone: get("phone"), note: get("note"), website: get("website") };
        const errs: Record<string, string> = {};
        if (values.name.trim().length < 2) errs.guestName = "Enter your name";
        if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errs.email = "Enter a valid email address";
        if (values.phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a phone number we can reach you on";
        if (Object.keys(errs).length) {
          setFieldErrors(errs);
          formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
          requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
          return;
        }
        void submit({ ...values, name: values.name });
      }}
    >
      {summary}
      <div className="mt-4 grid gap-4">
        <Field id="name" name="name" label="Name" autoComplete="name" enterKeyHint="next" defaultValue={guest?.name} error={fieldErrors.guestName} />
        <Field id="email" name="email" label="Email" type="email" autoComplete="email" inputMode="email" enterKeyHint="next" defaultValue={guest?.email} error={fieldErrors.email} hint="We send your confirmation and a cancel link here." />
        <Field id="phone" name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="next" defaultValue={guest?.phone} error={fieldErrors.phone} />
        <div className="field">
          <label htmlFor="note">Anything we should know? (optional)</label>
          <textarea id="note" name="note" className="input" maxLength={300} rows={2} enterKeyHint="done" placeholder="Allergies, a high chair, a birthday" />
        </div>
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Leave this field empty</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </div>
      {problemBlock}
      <Button type="submit" className="mt-5 w-full" loading={busy}>
        Confirm booking
      </Button>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  error,
  hint,
  ...rest
}: { id: string; name: string; label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const described = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={described} {...rest} />
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="error-text">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepDone({ ticket, onDone, variant }: { ticket: BookingTicket; onDone: () => void; variant: "sheet" | "page" }) {
  return (
    <div className="pt-2">
      <Ticket
        print
        data={{
          bookingRef: ticket.ref,
          guestName: ticket.guestName,
          partySize: ticket.partySize,
          dateLabel: ticket.dateLabel,
          timeLabel: ticket.timeLabel,
          address: ticket.address,
        }}
      />
      <p className="mt-6 text-center text-[16px]">
        We have emailed your confirmation with a link to cancel.{" "}
        <Link className="link" href={ticket.manageUrl.replace(/^https?:\/\/[^/]+/, "")}>
          Manage this booking
        </Link>
      </p>
      <div className="mt-5 flex justify-center">
        {variant === "sheet" ? (
          <Button onClick={onDone}>Done</Button>
        ) : (
          <Link className="btn btn-secondary" href="/">
            Back to the homepage
          </Link>
        )}
      </div>
    </div>
  );
}
