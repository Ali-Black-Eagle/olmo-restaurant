/**
 * Runs a local PostgreSQL (no Docker) on port 54329 with data in ./.pgdata.
 * Leave it running in a second terminal, then `npm run db:migrate` and `npm run db:seed`.
 */
import { startEmbeddedPg } from "./embedded-pg";

async function main() {
  const { url, stop } = await startEmbeddedPg({
    dir: ".pgdata",
    port: 54329,
    persistent: true,
    database: "olmo",
  });
  console.log(`Local Postgres is running.\nDATABASE_URL="${url}"\nPress Ctrl+C to stop.`);
  const shutdown = async () => {
    await stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
