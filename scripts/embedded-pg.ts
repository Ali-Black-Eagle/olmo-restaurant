import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

export type EmbeddedOptions = {
  dir: string;
  port: number;
  persistent: boolean;
  database: string;
};

/**
 * Starts a real PostgreSQL server from the `embedded-postgres` npm package
 * (no Docker needed). Used for local dev (`npm run db:local`) and by the test
 * suite. btree_gist ships with the binaries, so the exclusion constraint works.
 */
export async function startEmbeddedPg(opts: EmbeddedOptions) {
  const pg = new EmbeddedPostgres({
    databaseDir: opts.dir,
    user: "postgres",
    password: "postgres",
    port: opts.port,
    persistent: opts.persistent,
    onLog: () => {},
    onError: () => {},
  });
  const fresh = !existsSync(`${opts.dir}/PG_VERSION`);
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase(opts.database);
  const url = `postgresql://postgres:postgres@localhost:${opts.port}/${opts.database}`;
  return { pg, url, stop: () => pg.stop() };
}
