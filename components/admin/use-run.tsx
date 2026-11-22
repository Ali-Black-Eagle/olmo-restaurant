"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/admin";

export type Feedback = { ok: boolean; text: string; warnings?: string[] } | null;

/** Runs a server action, refreshes the page data, and keeps the last result for <Notice>. */
export function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function run(action: () => Promise<ActionResult>, after?: (r: ActionResult) => void) {
    start(async () => {
      try {
        const r = await action();
        setFeedback({ ok: r.ok, text: r.message ?? (r.ok ? "Saved." : "Something went wrong."), warnings: r.ok ? r.warnings : undefined });
        if (r.ok) router.refresh();
        after?.(r);
      } catch {
        setFeedback({ ok: false, text: "You may have been signed out. Reload the page and try again." });
      }
    });
  }
  return { run, pending, feedback, setFeedback };
}

export function Notice({ feedback }: { feedback: Feedback }) {
  if (!feedback) return <div aria-live="polite" />;
  return (
    <div aria-live="polite">
      <p role={feedback.ok ? "status" : "alert"} className={feedback.ok ? "flex items-start gap-2 font-semibold" : "error-text"}>
        {feedback.ok ? <CircleCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0" /> : <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />}
        <span>{feedback.text}</span>
      </p>
      {feedback.warnings?.map((w) => (
        <p key={w} className="error-text mt-2">
          <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          <span>{w}</span>
        </p>
      ))}
    </div>
  );
}
