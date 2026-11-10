import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "../supabase/migrations/20261110000016_performance_indexes_and_rls_initplan.sql");
const sql = fs.readFileSync(sqlPath, "utf-8");

const connectionString = "postgresql://postgres.qvvmpskixyjbislcatso:V9%23qL%4072%21mX%244zP%5E8wR%266kT%2A3nF%215jB@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  console.log("Connecting to Postgres via pooler...");
  await client.connect();
  console.log("Connected successfully! Executing migration 16...");

  const t0 = Date.now();
  await client.query(sql);
  const elapsed = Date.now() - t0;

  console.log(`Migration 16 applied successfully in ${elapsed}ms!`);
  await client.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
