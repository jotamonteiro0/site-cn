import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_nlGgEKNZC0_fNuoYM9Og2A_HUyoJ-4G";

const CHAPTER_CN_500 = "00000000-0000-0000-0000-000000000500";
const FOREIGN_CHAPTER_ID = "00000000-0000-0000-0000-000000000999";

describe("Auditoria Multi-Capítulo: Validação de Isolamento e Integridade Multi-Tenancy (Strict Read-Only)", () => {
  let adminClient;
  let anonClient;

  before(() => {
    adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  test("1. Isolamento de Censo: 100% dos membros pertencem exclusivamente ao Capítulo 500", async () => {
    const { data: foreignMembers, error } = await adminClient
      .from("members")
      .select("id, chapter_id, full_name")
      .neq("chapter_id", CHAPTER_CN_500);

    assert.ifError(error);
    assert.equal(
      foreignMembers.length,
      0,
      "Nenhum membro fora do Capítulo 500 deve existir na base institucional"
    );
  });

  test("2. Isolamento de Reuniões: 100% dos eventos de calendário pertencem ao Capítulo 500", async () => {
    const { data: foreignMeetings, error } = await adminClient
      .from("meetings")
      .select("id, chapter_id, title")
      .neq("chapter_id", CHAPTER_CN_500);

    assert.ifError(error);
    assert.equal(
      foreignMeetings.length,
      0,
      "Nenhuma reunião de outro capítulo deve constar na agenda"
    );
  });

  test("3. Isolamento de Tesouraria: cobranças financeiras pertencem exclusivamente ao Capítulo 500", async () => {
    const { data: foreignCharges, error } = await adminClient
      .from("member_charges")
      .select("id, chapter_id")
      .neq("chapter_id", CHAPTER_CN_500);

    assert.ifError(error);
    assert.equal(
      foreignCharges.length,
      0,
      "Nenhuma cobrança financeira de outro capítulo deve existir"
    );
  });

  test("4. Isolamento Contábil: períodos financeiros são restritos ao Capítulo 500", async () => {
    const { data: foreignPeriods, error } = await adminClient
      .from("financial_periods")
      .select("id, chapter_id")
      .neq("chapter_id", CHAPTER_CN_500);

    assert.ifError(error);
    assert.equal(
      foreignPeriods.length,
      0,
      "Nenhum período contábil externo deve existir"
    );
  });

  test("5. Bloqueio Cross-Chapter: consulta direcionada a tenant externo retorna estritamente 0 registros", async () => {
    const { data: members } = await adminClient
      .from("members")
      .select("id")
      .eq("chapter_id", FOREIGN_CHAPTER_ID);

    const { data: charges } = await adminClient
      .from("member_charges")
      .select("id")
      .eq("chapter_id", FOREIGN_CHAPTER_ID);

    const { data: meetings } = await adminClient
      .from("meetings")
      .select("id")
      .eq("chapter_id", FOREIGN_CHAPTER_ID);

    assert.equal(members.length, 0);
    assert.equal(charges.length, 0);
    assert.equal(meetings.length, 0);
  });

  test("6. Bloqueio RLS em cliente anônimo: acesso não autorizado a documentos restritos e finanças é rejeitado", async () => {
    // Cliente público/anônimo sem service_role
    const { data: privateDocs, error: docErr } = await anonClient
      .from("documents")
      .select("id, title")
      .eq("is_public", false);

    assert.ok(
      (privateDocs && privateDocs.length === 0) || docErr,
      "Cliente anônimo não pode listar documentos restritos"
    );

    const { data: charges, error: chgErr } = await anonClient
      .from("member_charges")
      .select("id, amount");

    assert.ok(
      (charges && charges.length === 0) || chgErr,
      "Cliente anônimo não pode acessar registros de cobrança"
    );
  });

  test("7. Unicidade e integridade estrutural: chaves compostas garantem isolamento multi-tenant", async () => {
    // Checa integridade de restrições relacionais compostas
    const { data: periods, error } = await adminClient
      .from("financial_periods")
      .select("id, year, month, chapter_id")
      .eq("chapter_id", CHAPTER_CN_500);

    assert.ifError(error);
    const seen = new Set();
    for (const p of periods) {
      const key = `${p.chapter_id}_${p.year}_${p.month}`;
      assert.equal(seen.has(key), false, `Chave composta duplicada detectada: ${key}`);
      seen.add(key);
    }
  });
});
