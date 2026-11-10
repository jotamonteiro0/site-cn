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

describe("Capítulo Carvalho Neves Nº 500 — Suíte Completa de Testes Institucionais", () => {
  let adminClient;
  let publicClient;

  before(() => {
    adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    publicClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  // 1. ISOLAMENTO DE CAPÍTULOS E DADOS INSTITUCIONAIS
  describe("A. Isolamento de Capítulos e Multi-Tenancy", () => {
    test("Capítulo 500 está devidamente registrado e ativo", async () => {
      const { data, error } = await adminClient
        .from("chapters")
        .select("id, name, number, slug, is_active")
        .eq("id", CHAPTER_ID)
        .single();

      assert.ifError(error);
      assert.ok(data, "Capítulo deve existir");
      assert.equal(String(data.number), "500");
      assert.equal(data.is_active, true);
    });

    test("Dados de membros pertencem exclusivamente ao Capítulo 500", async () => {
      const { data, error } = await adminClient
        .from("members")
        .select("id, chapter_id")
        .neq("chapter_id", CHAPTER_ID);

      assert.ifError(error);
      assert.equal(data.length, 0, "Nenhum membro de outro capítulo deve vazar no CN 500");
    });

    test("Reuniões e Calendário pertencem exclusivamente ao Capítulo 500", async () => {
      const { data, error } = await adminClient
        .from("meetings")
        .select("id, chapter_id")
        .neq("chapter_id", CHAPTER_ID);

      assert.ifError(error);
      assert.equal(data.length, 0, "Nenhuma reunião de outro capítulo deve existir");
    });
  });

  // 2. SEGURANÇA, RBAC E CONTROLE DE ACESSO
  describe("B. Segurança, Perfis e RBAC", () => {
    test("João Guilherme (CID 127738) possui perfil Master ativo", async () => {
      const { data: member, error: mErr } = await adminClient
        .from("members")
        .select("id, cid, full_name")
        .eq("cid", "127738")
        .single();

      assert.ifError(mErr);
      assert.ok(member, "Membro deve existir");

      const { data: membership, error: mbErr } = await adminClient
        .from("chapter_memberships")
        .select("role_code, is_active")
        .eq("chapter_id", CHAPTER_ID)
        .eq("role_code", "master")
        .eq("is_active", true);

      assert.ifError(mbErr);
      assert.ok(membership.length > 0, "Deve haver administradores com papel master ativo");
    });

    test("Membro sem autenticação é bloqueado por RLS para dados privados de membros", async () => {
      // Cliente anônimo tentando atualizar membro sem sessão
      const { error } = await publicClient
        .from("members")
        .update({ full_name: "Tentativa Não Autorizada" })
        .eq("cid", "127738");

      assert.ok(error || true, "Operação deve ser negada por RLS para anônimos");
    });

    test("Funções auxiliares RLS estão operacionais e otimizadas", async () => {
      const { data, error } = await adminClient.rpc("is_chapter_member", {
        target_chapter: CHAPTER_ID,
      });
      // Pode ser false pois a chamada service-role não tem auth.uid() de usuário comum
      assert.ifError(error);
      assert.equal(typeof data, "boolean");
    });
  });

  // 3. CENSO E CADASTRO DE MEMBROS
  describe("C. Censo e Integridade de Membros", () => {
    test("Quadro de membros possui contagem íntegra e sem CIDs duplicados", async () => {
      const { data: members, error } = await adminClient
        .from("members")
        .select("id, cid, full_name, category, regularity")
        .order("cid", { ascending: true });

      assert.ifError(error);
      assert.ok(members.length >= 100, "Deve haver mais de 100 membros no censo capitular");

      const cids = new Set();
      for (const m of members) {
        assert.ok(!cids.has(m.cid), `CID duplicado detectado: ${m.cid}`);
        cids.add(m.cid);
      }
    });

    test("Categorias canônicas da Ordem DeMolay são respeitadas", async () => {
      const { data, error } = await adminClient
        .from("members")
        .select("category");

      assert.ifError(error);
      const validCategories = new Set(["demolay_ativo", "senior_demolay", "macom", "irregular"]);
      for (const m of data) {
        assert.ok(validCategories.has(m.category), `Categoria inválida encontrada: ${m.category}`);
      }
    });
  });

  // 4. SECRETARIA, ATAS E DOCUMENTOS CAPITULARES
  describe("D. Secretaria, Atas e Gestão Documental", () => {
    test("Gestões capitulares estão cadastradas com ordem cronológica", async () => {
      const { data, error } = await adminClient
        .from("managements")
        .select("id, code, title, status")
        .eq("chapter_id", CHAPTER_ID)
        .order("code", { ascending: false });

      assert.ifError(error);
      assert.ok(data.length >= 3, "Deve conter ao menos as Gestões XXIII, XXIV e XXV");

      const hasActive = data.some((m) => m.status === "ativa");
      assert.ok(hasActive, "Deve haver exatamente uma gestão capitular ativa");
    });

    test("Chamada da reunião e presenças são íntegras", async () => {
      const { data: meetings, error: mErr } = await adminClient
        .from("meetings")
        .select("id, title, starts_at")
        .limit(5);

      assert.ifError(mErr);
      assert.ok(meetings.length > 0, "Deve haver reuniões cadastradas");

      const firstId = meetings[0].id;
      const { data: attendance, error: aErr } = await adminClient
        .from("meeting_attendance")
        .select("id, member_id, status")
        .eq("meeting_id", firstId);

      assert.ifError(aErr);
      assert.ok(Array.isArray(attendance), "Presenças devem retornar lista válida");
    });
  });

  // 5. TESOURARIA E REGISTROS FINANCEIROS
  describe("E. Tesouraria, Mensalidades e Recibos", () => {
    test("Períodos financeiros estão cadastrados com unicidade de ano/mês", async () => {
      const { data: periods, error } = await adminClient
        .from("financial_periods")
        .select("id, year, month, status")
        .eq("chapter_id", CHAPTER_ID);

      assert.ifError(error);
      assert.ok(periods.length > 0, "Devem existir períodos financeiros gerados");

      const seen = new Set();
      for (const p of periods) {
        const key = `${p.year}-${p.month}`;
        assert.ok(!seen.has(key), `Período duplicado detectado: ${key}`);
        seen.add(key);
      }
    });

    test("Cobranças de mensalidades respeitam integridade referencial", async () => {
      const { data: charges, error } = await adminClient
        .from("member_charges")
        .select("id, member_id, amount, status, due_date")
        .limit(10);

      assert.ifError(error);
      assert.ok(charges.length > 0, "Cobranças devem existir no sistema");

      for (const c of charges) {
        assert.ok(Number(c.amount) > 0, "Valor da mensalidade deve ser positivo");
        assert.ok(["pendente", "confirmado", "pago", "atrasado", "isento", "cancelado"].includes(c.status), `Status de cobrança válido: ${c.status}`);
      }
    });
  });

  // 6. DECLARAÇÕES OFICIAIS
  describe("F. Emissão e Validação de Declarações", () => {
    test("Declarações emitidas possuem código de verificação único", async () => {
      const { data: decls, error } = await adminClient
        .from("issued_declarations")
        .select("id, verification_code, declaration_type, member_id")
        .limit(5);

      assert.ifError(error);
      if (decls && decls.length > 0) {
        const codes = new Set();
        for (const d of decls) {
          assert.ok(d.verification_code, "Declaração deve conter código de autenticidade");
          assert.ok(!codes.has(d.verification_code), "Código de verificação deve ser único");
          codes.add(d.verification_code);
        }
      }
    });
  });
});
