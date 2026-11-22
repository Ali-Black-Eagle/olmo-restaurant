import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/olmo";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // A phone-sized Chromium: the booking sheet is designed phone-first.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grep: /@desktop/ },
  ],
  webServer: [
    {
      // Real PostgreSQL without Docker. Reuses it if `npm run db:local` is already running.
      command: "npx tsx scripts/db-local.ts",
      port: 54329,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npx prisma migrate deploy && npx prisma db seed && npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/api/availability?date=2030-01-01&party=2`,
      reuseExistingServer: true,
      timeout: 240_000,
      env: {
        DATABASE_URL,
        NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        BETTER_AUTH_URL: `http://localhost:${PORT}`,
        BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
        ADMIN_EMAILS: "admin@olmo.example",
      },
    },
  ],
});
