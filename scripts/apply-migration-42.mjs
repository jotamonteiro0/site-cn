import pg from 'pg';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')];
    })
);

const encodedPass = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
const connectionString = `postgresql://postgres.qvvmpskixyjbislcatso:${encodedPass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  await client.query('RESET ROLE;');

  const sql = fs.readFileSync('supabase/migrations/20261116000042_member_charges_rls_and_mc_photos.sql', 'utf-8');
  await client.query(sql);
  console.log('Migration 42 applied successfully to Supabase PostgreSQL!');

  // Test 1: Verify total charges (must be 382)
  const charges = await client.query('SELECT count(*) FROM public.member_charges;');
  console.log('Total member_charges count:', charges.rows[0].count);

  // Test 2: Verify active Council members (must be 18)
  const council = await client.query('SELECT count(*) FROM public.conselho_membros WHERE is_active = true;');
  console.log('Total active conselho_membros count:', council.rows[0].count);

  // Test 3: RLS test as authenticated user Aloísio
  await client.query('SET ROLE authenticated;');
  await client.query(`SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000009999", "email": "aloisio@exemplo.com", "user_metadata": {"id_demolay": "134104"}}', false);`);
  const aloisioRes = await client.query('SELECT count(*) FROM public.member_charges;');
  console.log('Aloisio (DeMolay ID 134104) charges query result:', aloisioRes.rows[0].count);

  // Test 4: RLS test as authenticated Master
  await client.query(`SELECT set_config('request.jwt.claims', '{"sub": "23cbac06-03e5-4981-b597-639d70cd7990", "email": "joaomonteiro0@icloud.com"}', false);`);
  const masterRes = await client.query('SELECT count(*) FROM public.member_charges;');
  console.log('Master (João Monteiro) charges query result:', masterRes.rows[0].count);

  // Test 5: Verify MC photos in DB
  await client.query('RESET ROLE;');
  const mcs = await client.query(`
    SELECT management_code, member_name, photo_url 
    FROM public.management_mc_photos 
    WHERE member_name ILIKE ANY(ARRAY['%Wesley%', '%Caio Carvalho%', '%Gustavo Vilarinho%', '%Cleison%', '%Tiago Moreira%'])
    ORDER BY management_code;
  `);
  console.log('MCs verified in DB:');
  console.table(mcs.rows);

  await client.end();
}
run().catch(console.error);
