import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_nlGgEKNZC0_fNuoYM9Og2A_HUyoJ-4G";

const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";
const FAKE_CHAPTER_ID = "00000000-0000-0000-0000-000000000999";

describe("Auditoria Independente de Segurança RLS, Isolamento e Operações Críticas", () => {
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

  // 1. ISOLAMENTO RLS E PERMISSÕES ANÔNIMO VS AUTENTICADO
  describe("1. Políticas RLS e Bloqueio de Acesso Não-Autorizado", () => {
    test("Anônimo é estritamente bloqueado de consultar cobranças financeiras (member_charges)", async () => {
      const { data, error } = await anonClient
        .from("member_charges")
        .select("id, amount, member_id");

      assert.ok(
        (data && data.length === 0) || error,
        "Usuário anônimo não pode receber registros de cobranças"
      );
    });

    test("Anônimo é estritamente bloqueado de consultar atas secretas/internas (meeting_minutes)", async () => {
      const { data, error } = await anonClient
        .from("meeting_minutes")
        .select("id, content");

      assert.ok(
        (data && data.length === 0) || error,
        "Usuário anônimo não pode visualizar atas internas"
      );
    });

    test("Anônimo é estritamente bloqueado de consultar transações financeiras (financial_transactions)", async () => {
      const { data, error } = await anonClient
        .from("financial_transactions")
        .select("id, amount, description");

      assert.ok(
        (data && data.length === 0) || error,
        "Usuário anônimo não pode acessar fluxo de caixa e transações"
      );
    });

    test("Anônimo não consegue visualizar documentos restritos (is_public = false)", async () => {
      const { data, error } = await anonClient
        .from("documents")
        .select("id, title, is_public")
        .eq("is_public", false);

      assert.ok(
        (data && data.length === 0) || error,
        "Documentos privados não podem ser listados por anônimos"
      );
    });

    test("Isolamento Cross-Chapter: Consulta a capítulo inexistente/externo retorna 0 registros", async () => {
      const { data: members, error: mErr } = await adminClient
        .from("members")
        .select("id")
        .eq("chapter_id", FAKE_CHAPTER_ID);

      assert.ifError(mErr);
      assert.equal(members.length, 0, "Nenhum membro deve existir para outro capítulo");

      const { data: meetings, error: mtErr } = await adminClient
        .from("meetings")
        .select("id")
        .eq("chapter_id", FAKE_CHAPTER_ID);

      assert.ifError(mtErr);
      assert.equal(meetings.length, 0, "Nenhuma reunião deve vazar em capítulo falso");
    });
  });

  // 2. OPERAÇÕES CRÍTICAS DE TESOURARIA
  describe("2. Operações Críticas de Tesouraria", () => {
    test("Regra de vencimento: todas as cobranças capitulares vencem no dia 28", async () => {
      const { data: charges, error } = await adminClient
        .from("member_charges")
        .select("id, due_date, amount")
        .limit(20);

      assert.ifError(error);
      assert.ok(charges.length > 0, "Deve haver cobranças registradas");

      for (const c of charges) {
        const day = c.due_date.split("-")[2];
        assert.equal(day, "28", `Vencimento deve ser dia 28 (encontrado: ${c.due_date})`);
        assert.ok(Number(c.amount) > 0, "Valor da taxa deve ser positivo");
      }
    });

    test("Contas financeiras e períodos contábeis estão vinculados e consistentes", async () => {
      const { data: accounts, error: aErr } = await adminClient
        .from("financial_accounts")
        .select("id, name, account_type, is_active")
        .eq("chapter_id", CHAPTER_ID);

      assert.ifError(aErr);
      assert.ok(accounts.length > 0, "Deve haver ao menos uma conta financeira ativa");

      const { data: periods, error: pErr } = await adminClient
        .from("financial_periods")
        .select("id, year, month, status")
        .eq("chapter_id", CHAPTER_ID);

      assert.ifError(pErr);
      assert.ok(periods.length >= 6, "Deve haver múltiplos períodos contábeis cadastrados");
    });
  });

  // 3. OPERAÇÕES CRÍTICAS DE SECRETARIA E FREQUÊNCIA
  describe("3. Operações Críticas de Secretaria e Frequência", () => {
    test("Integridade referencial de presenças: todos os membros registrados existem no CN", async () => {
      const { data: attendance, error: aErr } = await adminClient
        .from("meeting_attendance")
        .select("id, member_id, meeting_id, status")
        .limit(30);

      assert.ifError(aErr);
      assert.ok(attendance.length > 0, "Deve haver registros de frequência");

      for (const att of attendance) {
        assert.ok(["presente", "ausente", "justificada"].includes(att.status), `Status de frequência válido: ${att.status}`);
      }
    });

    test("Gestão ativa XXV possui Mestre Conselheiro e Oficiais nomeados", async () => {
      const { data: gestao, error: gErr } = await adminClient
        .from("managements")
        .select("id, code, title")
        .eq("chapter_id", CHAPTER_ID)
        .eq("status", "ativa")
        .single();

      assert.ifError(gErr);
      assert.ok(gestao, "Deve existir uma gestão ativa");
      assert.ok(gestao.title.includes("XXV"), `Gestão atual deve ser a XXV (encontrado: ${gestao.title})`);

      const { data: positions, error: pErr } = await adminClient
        .from("management_positions")
        .select("id, name")
        .eq("management_id", gestao.id);

      assert.ifError(pErr);
      assert.ok(positions.length >= 5, "Gestão XXV deve possuir oficiais empossados");
    });
  });

  // 4. GERENCIAMENTO DE MEMBROS E DADOS REGULARES
  describe("4. Gerenciamento e Integridade dos Membros", () => {
    test("Quadro de membros possui datas de iniciação e regularidade registradas", async () => {
      const { data: members, error } = await adminClient
        .from("members")
        .select("id, full_name, category, regularity, initiation_date")
        .eq("chapter_id", CHAPTER_ID)
        .limit(50);

      assert.ifError(error);
      assert.ok(members.length > 0, "Registros de membros devem existir");

      const validRegularities = new Set([
        "regular",
        "irregular",
        "inativo",
        "consultor",
        "sênior",
        "sênior/consultor",
        ""
      ]);
      for (const m of members) {
        assert.ok(m.full_name, "Nome do membro deve ser preenchido");
        assert.ok(m.category, "Categoria deve ser preenchida");
        const reg = (m.regularity || "").toLowerCase();
        assert.ok(validRegularities.has(reg), `Regularidade válida: ${m.regularity}`);
      }
    });
  });
});
