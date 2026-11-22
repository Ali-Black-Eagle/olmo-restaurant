import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startEmbeddedPg } from "../scripts/embedded-pg";

/**
 * Database tests run against a real Postgres. Order of preference:
 *   1. TEST_DATABASE_URL (e.g. the docker/CI database) with migrations applied
 *   2. a throwaway embedded Postgres started here (no Docker required)
 * If neither works, DB tests skip themselves; pure-logic tests still run.
 */
export default async function setup() {
  let stop: (() => Promise<unknown>) | undefined;
  let dir: string | undefined;
  try {
    let url = process.env.TEST_DATABASE_URL;
    if (!url) {
      dir = mkdtempSync(join(tmpdir(), "olmo-pg-"));
      const started = await startEmbeddedPg({ dir, port: 54339, persistent: false, database: "olmo_test" });
      url = started.url;
      stop = started.stop;
    }
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
      shell: true,
    });
    process.env.TEST_DATABASE_URL = url;
  } catch (e) {
    console.warn("\n[tests] No test database available. DB tests will be skipped.\n", String(e).slice(0, 300));
    delete process.env.TEST_DATABASE_URL;
  }

  return async () => {
    try {
      await stop?.();
    } catch {}
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
  };
}
