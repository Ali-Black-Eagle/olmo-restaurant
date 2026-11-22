import { Resend } from "resend";
import type { ReactElement } from "react";
import { render } from "@react-email/render";

export type EmailAttachment = { filename: string; content: string; contentType?: string };

export type SendArgs = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  attachments?: EmailAttachment[];
  /** Resend de-duplicates sends that share a key for 24h. */
  idempotencyKey?: string;
};

export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "Olmo <onboarding@resend.dev>";
}

/**
 * Sends an email through Resend. Never throws: a failed email must not fail a booking.
 * With no RESEND_API_KEY it logs the email (subject + plain text) so the flow can be
 * developed and demoed without an account.
 */
export async function sendEmail(args: SendArgs): Promise<{ sent: boolean; logged?: boolean; error?: string }> {
  try {
    const [html, text] = await Promise.all([render(args.react), render(args.react, { plainText: true })]);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // On a deployed site, never write email bodies (cancel links, sign-in links, guest
      // details) to the logs; only note that sending was skipped.
      if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
        console.warn(`[email] RESEND_API_KEY not set; skipped "${args.subject}".`);
        return { sent: false };
      }
      console.log(
        `\n[email:dev] RESEND_API_KEY not set, not sending.\n  to: ${[args.to].flat().join(", ")}\n  subject: ${args.subject}\n  attachments: ${(args.attachments ?? []).map((a) => a.filename).join(", ") || "none"}\n  ---\n${text}\n  ---\n`,
      );
      return { sent: false, logged: true };
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(
      {
        from: emailFrom(),
        to: args.to,
        subject: args.subject,
        html,
        text,
        attachments: args.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
    if (error) {
      console.error("[email] Resend rejected the message:", error.message);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] failed:", e instanceof Error ? e.message : e);
    return { sent: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
