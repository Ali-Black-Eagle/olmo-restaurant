"use client";

import { CircleAlert, MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: "/admin" });
      // The server answers the same way for every address, so this never reveals who is staff.
      setState(res.error && (res.error.status ?? 500) >= 429 ? "error" : "sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="panel mt-8 p-6">
        <MailCheck aria-hidden="true" size={28} />
        <h2 className="mt-3 font-display text-3xl">Check your inbox</h2>
        <p className="mt-2 admin-muted">
          If {email} is on the staff list, a sign-in link is on its way. It works once and expires in 10 minutes.
        </p>
        <button type="button" className="link mt-4 min-h-11" onClick={() => setState("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-4" noValidate={false}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state === "error" || undefined}
          aria-describedby={state === "error" ? "login-error" : undefined}
        />
      </div>
      {state === "error" ? (
        <p id="login-error" role="alert" className="error-text">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          We could not send the link. Try again in a minute.
        </p>
      ) : null}
      <Button type="submit" loading={state === "sending"}>
        Send sign-in link
      </Button>
    </form>
  );
}
