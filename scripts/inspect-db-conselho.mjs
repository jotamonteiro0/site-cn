import pg from "pg";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
    })
);

const client = new pg.Client({
  host: "db.qvvmpskixyjbislcatso.supabase.co",
  port: 5432,
  user: "postgres",
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const mgmtCols = await client.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'managements'
  ORDER BY ordinal_position;
`);
console.log("Colunas de managements:", mgmtCols.rows);

const mgmtRows = await client.query(`SELECT * FROM managements;`);
console.log("Linhas de managements:", mgmtRows.rows);

const tablesRes = await client.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
`);
console.log("Tabelas no schema public:", tablesRes.rows.map(r => r.table_name));

await client.end();
