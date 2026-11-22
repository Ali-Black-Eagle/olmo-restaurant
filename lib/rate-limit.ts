import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Fixed-window counter in Postgres (one atomic upsert, all time maths done by the
 * database in UTC). Returns true when the call is allowed. Fine for a single
 * restaurant; swap for Upstash if traffic ever demands it.
 */
export async function rateLimit(db: PrismaClient, key: string, limit: number, windowSec: number): Promise<boolean> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, (now() AT TIME ZONE 'utc') + make_interval(secs => ${windowSec}::int))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < (now() AT TIME ZONE 'utc') THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < (now() AT TIME ZONE 'utc')
                       THEN (now() AT TIME ZONE 'utc') + make_interval(secs => ${windowSec}::int)
                       ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 1) <= limit;
}
