import { siteUrl } from "@/lib/data";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { createElement } from "react";
import MagicLink from "@/emails/MagicLink";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** Staff allow-list. Only these addresses ever receive a link or get an account. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdminEmail = (email: string | null | undefined) => Boolean(email) && adminEmails().includes(email!.toLowerCase());

function createAuth() {
  return betterAuth({
    database: prismaAdapter(db, { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || siteUrl(),
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
    databaseHooks: {
      user: {
        create: {
          // Belt and braces: even a forged sign-up cannot create a non-staff user.
          before: async (user) => (isAdminEmail(user.email) ? { data: user } : false),
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 10,
        sendMagicLink: async ({ email, url }) => {
          // Same response for everyone: no email enumeration. Only staff get a real email.
          if (!isAdminEmail(email)) return;
          await sendEmail({
            to: email,
            subject: "Your Olmo admin sign-in link",
            react: createElement(MagicLink, { url }),
          });
          if (!process.env.RESEND_API_KEY && !process.env.VERCEL_ENV) console.log(`[auth:dev] magic link for ${email}: ${url}`);
        },
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** Lazy so that importing this file (during `next build`) never needs a database. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
