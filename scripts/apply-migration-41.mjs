import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "../supabase/migrations/20261116000041_member_profile_extensions_and_immutability.sql");
const sql = fs.readFileSync(sqlPath, "utf-8");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
    })
);

const encodedPass = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
const connectionString = `postgresql://postgres.qvvmpskixyjbislcatso:${encodedPass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function run() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  console.log("Connecting to Postgres via pooler...");
  await client.connect();
  console.log("Connected successfully! Executing migration 41...");

  const t0 = Date.now();
  await client.query(sql);
  const elapsed = Date.now() - t0;

  console.log(`Migration 41 applied successfully in ${elapsed}ms!`);

  // Verify added columns
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name IN ('cpf', 'blood_type', 'cover_photo_url', 'father_name');
  `);
  console.log("Verified added columns:", cols.rows);

  await client.end();
}

run().catch((err) => {
  console.error("Migration 41 failed:", err);
  process.exit(1);
});
