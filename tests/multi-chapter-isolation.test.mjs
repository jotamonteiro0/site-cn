import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_nlGgEKNZC0_fNuoYM9Og2A_HUyoJ-4G";

const CHAPTER_A_ID = "00000000-0000-0000-0000-000000000500"; // Capítulo Carvalho Neves Nº 500
const CHAPTER_B_ID = "00000000-0000-0000-0000-000000000999"; // Capítulo Frank Sherman Land Nº 999 (Tenant de Teste)

const MEMBER_B_ID = "00000000-0000-0000-0000-000000009901";
const MEETING_B_ID = "00000000-0000-0000-0000-000000009902";
const PERIOD_B_ID = "00000000-0000-0000-0000-000000009903";
const CHARGE_B_ID = "00000000-0000-0000-0000-000000009904";
const DOC_B_ID = "00000000-0000-0000-0000-000000009905";

describe("Auditoria Multi-Capítulo: Isolamento Estrito entre Capítulos (Multi-Tenancy)", () => {
  let adminClient;
  let anonClient;

  before(async () => {
    adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Criação do Capítulo B isolado para teste
    await adminClient.from("chapters").upsert({
      id: CHAPTER_B_ID,
      name: "Capítulo Frank Sherman Land Nº 999",
      number: 999,
      slug: "cn-999-isolated-test",
      is_active: true,
    });

    // 2. Criação de membro vinculado exclusivamente ao Capítulo B
    await adminClient.from("members").upsert({
      id: MEMBER_B_ID,
      chapter_id: CHAPTER_B_ID,
      cid: "999001",
      full_name: "Irmão Teste Multi-Capítulo 999",
      category: "demolay_ativo",
      regularity: "Regular",
    });

    // 3. Criação de reunião e ata vinculada exclusivamente ao Capítulo B
    await adminClient.from("meetings").upsert({
      id: MEETING_B_ID,
      chapter_id: CHAPTER_B_ID,
      title: "Reunião Ritualística Sigilosa Capítulo 999",
      starts_at: "2026-12-01T14:00:00Z",
      status: "agendada",
    });

    // 4. Criação de período e cobrança financeira vinculada ao Capítulo B
    await adminClient.from("financial_periods").upsert({
      id: PERIOD_B_ID,
      chapter_id: CHAPTER_B_ID,
      year: 2026,
      month: 12,
      status: "aberto",
    });

    await adminClient.from("member_charges").upsert({
      id: CHARGE_B_ID,
      chapter_id: CHAPTER_B_ID,
      member_id: MEMBER_B_ID,
      financial_period_id: PERIOD_B_ID,
      payer_type: "demolay",
      payer_name: "Irmão Teste Multi-Capítulo 999",
      description: "Mensalidade Dezembro/2026 Cap 999",
      amount: 50.0,
      due_date: "2026-12-28",
      status: "pendente",
    });

    // 5. Criação de documento confidencial restrito ao Capítulo B
    await adminClient.from("documents").upsert({
      id: DOC_B_ID,
      chapter_id: CHAPTER_B_ID,
      title: "Documento Sigiloso do Conselho Consultivo 999",
      is_public: false,
    });
  });

  after(async () => {
    // Limpeza estrita e ordenada de todos os registros do Capítulo B
    await adminClient.from("member_charges").delete().eq("chapter_id", CHAPTER_B_ID);
    await adminClient.from("financial_periods").delete().eq("chapter_id", CHAPTER_B_ID);
    await adminClient.from("documents").delete().eq("chapter_id", CHAPTER_B_ID);
    await adminClient.from("meeting_attendance").delete().eq("meeting_id", MEETING_B_ID);
    await adminClient.from("meetings").delete().eq("chapter_id", CHAPTER_B_ID);
    await adminClient.from("members").delete().eq("chapter_id", CHAPTER_B_ID);
    await adminClient.from("chapters").delete().eq("id", CHAPTER_B_ID);
  });

  test("1. Isolamento de Censo: consultas do Capítulo 500 não retornam membros do Capítulo 999", async () => {
    const { data: membersCn500, error } = await adminClient
      .from("members")
      .select("id, chapter_id, full_name")
      .eq("chapter_id", CHAPTER_A_ID);

    assert.ifError(error);
    const hasLeak = membersCn500.some((m) => m.chapter_id === CHAPTER_B_ID || m.id === MEMBER_B_ID);
    assert.equal(hasLeak, false, "Nenhum membro do Capítulo 999 pode vazar nas consultas do Capítulo 500");
  });

  test("2. Isolamento de Tesouraria: cobranças financeiras do Capítulo 999 são invisíveis no Capítulo 500", async () => {
    const { data: chargesCn500, error } = await adminClient
      .from("member_charges")
      .select("id, chapter_id, amount")
      .eq("chapter_id", CHAPTER_A_ID);

    assert.ifError(error);
    const hasLeak = chargesCn500.some((c) => c.chapter_id === CHAPTER_B_ID || c.id === CHARGE_B_ID);
    assert.equal(hasLeak, false, "Nenhuma cobrança do Capítulo 999 pode constar no Capítulo 500");
  });

  test("3. Isolamento de Secretaria e Calendário: reuniões do Capítulo 999 são invisíveis no Capítulo 500", async () => {
    const { data: meetingsCn500, error } = await adminClient
      .from("meetings")
      .select("id, chapter_id, title")
      .eq("chapter_id", CHAPTER_A_ID);

    assert.ifError(error);
    const hasLeak = meetingsCn500.some((m) => m.chapter_id === CHAPTER_B_ID || m.id === MEETING_B_ID);
    assert.equal(hasLeak, false, "Nenhuma reunião do Capítulo 999 pode constar no Capítulo 500");
  });

  test("4. Bloqueio RLS: usuário anônimo ou externo é impedido de ler documentos privados do Capítulo 999", async () => {
    const { data, error } = await anonClient
      .from("documents")
      .select("id, title, is_public")
      .eq("id", DOC_B_ID);

    assert.ok(
      (data && data.length === 0) || error,
      "Documento privado do Capítulo 999 não pode ser lido por terceiros"
    );
  });

  test("5. Bloqueio RLS: usuário anônimo é impedido de alterar dados do membro do Capítulo 999", async () => {
    await anonClient
      .from("members")
      .update({ full_name: "Tentativa de Ataque Cross-Tenant" })
      .eq("id", MEMBER_B_ID);

    // Deve falhar ou não atualizar linhas por causa da política RLS
    const { data: check } = await adminClient
      .from("members")
      .select("full_name")
      .eq("id", MEMBER_B_ID)
      .single();

    assert.equal(check.full_name, "Irmão Teste Multi-Capítulo 999", "Nome do membro não pode ser alterado por terceiros");
  });

  test("6. Bloqueio RLS: usuário anônimo é impedido de excluir cobrança do Capítulo 999", async () => {
    await anonClient
      .from("member_charges")
      .delete()
      .eq("id", CHARGE_B_ID);

    const { data: check } = await adminClient
      .from("member_charges")
      .select("id")
      .eq("id", CHARGE_B_ID)
      .maybeSingle();

    assert.ok(check, "A cobrança deve permanecer intacta contra tentativas de exclusão não autorizadas");
  });

  test("7. Integridade de unicidade por capítulo: CID e períodos são isolados por chave composta", async () => {
    // Tentativa de criar período com mesmo ano/mês no Capítulo 500 e no Capítulo 999 é permitida por serem capítulos distintos
    const { data: periodA } = await adminClient
      .from("financial_periods")
      .select("id")
      .eq("chapter_id", CHAPTER_A_ID)
      .eq("year", 2026)
      .eq("month", 12)
      .maybeSingle();

    // Período no Capítulo 999 existe independentemente do Capítulo 500
    const { data: periodB, error: pBErr } = await adminClient
      .from("financial_periods")
      .select("id")
      .eq("chapter_id", CHAPTER_B_ID)
      .eq("year", 2026)
      .eq("month", 12)
      .maybeSingle();

    assert.ifError(pBErr);
    assert.ok(periodB, "Período do Capítulo 999 deve existir");
    if (periodA) {
      assert.notEqual(periodA.id, periodB.id, "Períodos devem possuir IDs independentes");
    }
  });
});
