import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function createDb(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);

const globalForDb = globalThis as unknown as { __olmoDb?: PrismaClient };

function getDb(): PrismaClient {
  if (!globalForDb.__olmoDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    globalForDb.__olmoDb = createDb(url);
  }
  return globalForDb.__olmoDb;
}

/** Lazy singleton: importing this file never connects, so builds work without a database. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = getDb() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
