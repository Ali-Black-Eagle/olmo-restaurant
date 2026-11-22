# Olmo

A restaurant website with real table booking. Olmo is a fictional wood-fired bistro in Bristol, built as a portfolio piece: live availability, no double bookings, confirmation emails with cancel links and a calendar file, a staff admin, and local SEO.

Stack: Next.js 16 (App Router), TypeScript strict, Tailwind v4, Prisma 7, PostgreSQL, Resend + React Email, Better Auth (magic link), motion, vaul, zod, date-fns, Vitest, Playwright.

## What is in it

- **Public site**: home (hero sequence, "free today for two" strip, signature dishes), menu (filters by diet, leave out any of the 14 allergens, dish detail sheet), visit (hours from the database, click-to-load map), book (`/book`), manage booking (`/booking/OLM-XXXX?t=token`).
- **Booking in three taps**: a vaul bottom sheet (party size, day and time, confirm). Details are remembered in the browser so a returning guest taps once. The browser Back button steps back through the sheet. On success a kitchen-order "ticket" prints out.
- **No double bookings, by the database**: `prisma/migrations/20261122034600_no_double_booking` adds a PostgreSQL exclusion constraint (`btree_gist`) on table and time range. The app picks the best-fit table, and if two requests race for the same table the loser gets error `23P01` and the engine tries the next table or offers nearby times. A test fires 20 parallel bookings at the last free table and asserts exactly one wins.
- **Emails** (React Email via Resend): confirmation with `.ics` attachment and Google Calendar link, cancellation, staff notification, sign-in link. Failures are logged and never fail a booking. With no `RESEND_API_KEY` the email is printed to the server log.
- **Cancel links**: a 32-byte random token, only its SHA-256 hash is stored, compared in constant time. Opening the link never cancels anything: cancelling is a confirmed POST (Server Action).
- **Admin** (`/admin`, magic-link sign in, light and dark): Today timeline per table with covers per service and one-tap Seated / Completed / No-show, bookings (search, add phone or walk-in booking, edit time or party through the same engine, cancel), opening hours (weekly grid and special days, with a warning about bookings that fall outside), tables and combinations, menu (add, edit, drag to reorder, sold out toggle, image upload to Vercel Blob), settings.
- **SEO**: JSON-LD generated from the database (`Restaurant` with opening hours and `ReserveAction`, `Menu`, `BreadcrumbList`), per-page metadata, sitemap, robots, dynamic OG image, web manifest.

## Run it locally

You need Node 20.9 or newer (developed on Node 24). You do **not** need Docker: a real PostgreSQL ships in the `embedded-postgres` npm package.

```bash
npm install
cp .env.example .env          # the defaults work for local development

# terminal 1: a local PostgreSQL on port 54329 (data in ./.pgdata)
npm run db:local

# terminal 2
npm run db:migrate            # applies the migrations, including the exclusion constraint
npm run db:seed               # settings, 12 tables, 2 combinations, hours, 28 dishes, sample bookings
npm run dev                   # http://localhost:3000
```

If you would rather use Docker or a Postgres you already have, point `DATABASE_URL` at any PostgreSQL 13+ and run the same migrate and seed commands.

Without a `DATABASE_URL` the site still builds and shows the demo content, but booking and admin are switched off with a clear message.

### Admin sign in locally

1. Set `ADMIN_EMAILS` in `.env` to your email (default: `admin@olmo.example`).
2. Go to `/admin/login` and submit that email.
3. With no `RESEND_API_KEY`, the sign-in link is printed in the `npm run dev` terminal as `[auth:dev] magic link for ...`. Open it.

Addresses not on `ADMIN_EMAILS` get the same "check your inbox" message but no email and no account.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: pure logic plus database tests (see below) |
| `npm run e2e` | Playwright against `next dev` on port 3100 (starts the local database if needed). First run: `npx playwright install chromium` |
| `npm run db:local` | Local PostgreSQL without Docker |
| `npm run db:migrate` / `db:seed` / `db:reset` | Prisma |

### Tests

`npm test` runs, with no setup:

- slot generation across both UK daylight-saving changes, special days, minimum notice
- best-fit table assignment, combinations, back-to-back bookings
- availability and nearest-time suggestions
- cancel token generation and constant-time verification
- **database tests** against a real throwaway PostgreSQL (started automatically through `embedded-postgres`, or set `TEST_DATABASE_URL`): the exclusion constraint, 20 parallel bookings for one table, SLOT_TAKEN with alternatives, combos, cancel frees the table, rate limiting. If no database can start, those tests skip and say so.

## Accounts and settings you need to create yourself

Nothing here has been signed up for or deployed on your behalf.

1. **Vercel** (hosting). Import the repo.
2. **Neon database**: in the Vercel project, Storage, add Neon from the Marketplace. It sets `DATABASE_URL` automatically. Then run migrations and seed against it once:
   `DATABASE_URL="<neon url>" npx prisma migrate deploy && DATABASE_URL="<neon url>" npx prisma db seed`.
   Neon supports the `btree_gist` extension the migration creates.
3. **Resend** (email): create an account and an API key, then verify your sending domain (add the DNS records Resend shows you). Set `RESEND_API_KEY` and `EMAIL_FROM` (for example `Olmo <bookings@your-domain>`). Until the domain is verified, Resend's test sender only delivers to your own account email, so test booking emails with your own address.
4. **Vercel Blob** (optional, dish photo uploads): Storage, add Blob. It sets `BLOB_READ_WRITE_TOKEN`.
5. **Environment variables** on Vercel: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `STAFF_NOTIFY_EMAIL`, `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`), `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` (both your production URL), `ADMIN_EMAILS`, `BLOB_READ_WRITE_TOKEN`.
6. **Vercel BotID** (optional): enable it in the project's Firewall settings. The code is already wired in and does nothing until you do.

## Deploy to Vercel (later)

```bash
npm i -g vercel
vercel link
vercel env pull .env     # after adding the variables above
vercel --prod
```

`npm run build` runs `prisma generate` first, and `postinstall` does too, so no extra build step is needed.

## Notes and decisions

- `proxy.ts` (Next 16's replacement for middleware) only redirects signed-out visitors away from `/admin` by checking for a session cookie. Every admin page and Server Action re-checks the session and the `ADMIN_EMAILS` allow-list on the server.
- Prisma uses `@prisma/adapter-pg` for every database, including Neon (over its pooled TCP connection), which works in the Node.js runtime on Vercel.
- `BookingTable.during` is a `tstzrange`, which Prisma cannot write, so rows are inserted with raw SQL inside the booking transaction. Everything else uses the Prisma client.
- Public pages are statically generated and revalidated hourly, and the admin calls `revalidatePath` on save. Availability is always fetched live (`no-store`).
- Rate limits (5 bookings per hour per IP, 3 per day per email) live in a Postgres table.
- The photos are from Unsplash, see `CREDITS.md`. Olmo, its address, phone number, suppliers and menu are all invented.
