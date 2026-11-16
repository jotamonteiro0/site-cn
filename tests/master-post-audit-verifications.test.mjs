import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORICAL_MEETINGS } from "../lib/data/historicalMeetings.ts";
import { authenticAtasDocuments } from "../lib/data/historicalAtasDocs.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

describe("Revisão Pós-Homologação — Acesso Master & Regras Institucionais", () => {
  // 1. MESTRES CONSELHEIROS POR GESTÃO
  describe("1. Correspondência Oficial de Mestres Conselheiros", () => {
    test("Gestão XXV (2026.2) possui Rafael Inácio como MC em todos os dados canônicos", () => {
      const g25Meetings = HISTORICAL_MEETINGS.filter((m) => m.management && m.management.includes("XXV"));
      assert.equal(g25Meetings.length, 6, "Gestão XXV deve possuir 6 reuniões históricas");
      g25Meetings.forEach((m) => {
        assert.equal(m.mc_name, "Rafael Inácio do Nascimento de Morais", "Reuniões da Gestão XXV devem ter Rafael Inácio como MC");
      });

      const mcPhotos = JSON.parse(fs.readFileSync(path.join(rootDir, "data/mc_photos.json"), "utf-8"));
      const g25Photo = mcPhotos.find((p) => p.management_code === "2026.2");
      assert.ok(g25Photo);
      assert.equal(g25Photo.member_name, "Rafael Inácio do Nascimento de Morais");
      assert.equal(g25Photo.photo_url, "/gestoes/rafael-inacio.2026.2.jpg");
      assert.equal(g25Photo.status, "Atual");

      const g26Photo = mcPhotos.find((p) => p.management_code === "2027.1");
      assert.ok(g26Photo);
      assert.notEqual(g26Photo.member_name, "Rafael Inácio do Nascimento de Morais", "Gestão XXVI não deve presumir Rafael Inácio");
      assert.equal(g26Photo.member_name, "A definir");
    });

    test("Gestão XXIV (2026.1) possui José Keltton e Gestão XXIII (2025.2) possui João Guilherme", () => {
      const g24Meetings = HISTORICAL_MEETINGS.filter((m) => m.management && m.management.includes("XXIV"));
      assert.equal(g24Meetings.length, 12);
      g24Meetings.forEach((m) => {
        assert.equal(m.mc_name, "José Keltton da Silva Cardoso Viana");
      });

      const mcPhotos = JSON.parse(fs.readFileSync(path.join(rootDir, "data/mc_photos.json"), "utf-8"));
      const g24 = mcPhotos.find((p) => p.management_code === "2026.1");
      assert.equal(g24.member_name, "José Keltton da Silva Cardoso Viana");

      const g23 = mcPhotos.find((p) => p.management_code === "2025.2");
      assert.equal(g23.member_name, "João Guilherme Martins Lopes Monteiro");
    });
  });

  // 2. CONFERÊNCIA DAS 20 ATAS
  describe("2. Conferência Rigorosa das 20 Atas com Documentos PDF Oficiais", () => {
    test("Exatamente 20 PDFs físicos autênticos existem em public/documentos/atas/", () => {
      const atasDir = path.join(rootDir, "public/documentos/atas");
      const files = fs.readdirSync(atasDir).filter((f) => f.endsWith(".pdf"));
      assert.equal(files.length, 20, "Devem existir exatamente 20 arquivos de atas em PDF");

      assert.equal(authenticAtasDocuments.length, 20, "authenticAtasDocuments deve listar exatamente 20 atas");

      // 11 atas da Gestão XXIII (2025.2) e 9 atas da Gestão XXIV (2026.1)
      const atasG23 = authenticAtasDocuments.filter((a) => a.management.includes("XXIII"));
      const atasG24 = authenticAtasDocuments.filter((a) => a.management.includes("XXIV"));
      assert.equal(atasG23.length, 11, "Gestão XXIII deve conter 11 atas autênticas");
      assert.equal(atasG24.length, 9, "Gestão XXIV deve conter 9 atas autênticas");

      atasG23.forEach((a) => {
        assert.equal(a.mcName, "MC João Guilherme Martins Lopes Monteiro");
        assert.ok(fs.existsSync(path.join(atasDir, a.fileName)), `Arquivo ${a.fileName} deve existir no disco`);
      });

      atasG24.forEach((a) => {
        assert.equal(a.mcName, "MC José Keltton da Silva Cardoso Viana");
        assert.ok(fs.existsSync(path.join(atasDir, a.fileName)), `Arquivo ${a.fileName} deve existir no disco`);
      });
    });
  });

  // 3. REGRAS DOS QUATRO PERFIS MASTER
  describe("3. Quatro Perfis de Acesso Master (Permanentes e Temporários)", () => {
    const masterAuthPath = path.join(rootDir, "lib/master-auth.ts");

    test("lib/master-auth.ts contempla João Guilherme (127738) e José Airton (102836) como permanentes", () => {
      const code = fs.readFileSync(masterAuthPath, "utf-8");
      assert.ok(code.includes("127738"), "Deve conter ID 127738");
      assert.ok(code.includes("102836"), "Deve conter ID 102836");
      assert.ok(code.includes("jarodriguesj1@gmail.com"), "Deve conter email canônico de José Airton");
    });

    test("lib/master-auth.ts contempla Mestre Conselheiro vigente e PCC temporários na gestão ativa", () => {
      const code = fs.readFileSync(masterAuthPath, "utf-8");
      assert.ok(code.includes("Presidente do Conselho Consultivo"), "Deve checar PCC");
      assert.ok(code.includes("Mestre Conselheiro"), "Deve checar Mestre Conselheiro vigente");
      assert.ok(code.includes('eq("management.status", "ativa")'), "Validação vinculada estritamente à gestão ativa");
    });
  });

  // 4. RESTRIÇÃO POR GESTÃO E EXCLUSÃO DE REUNIÕES
  describe("4. Gerenciamento do Calendário — Restrição por Gestão e Cancelamento", () => {
    const routeIdPath = path.join(rootDir, "app/api/meetings/[id]/route.ts");
    const routeListPath = path.join(rootDir, "app/api/meetings/route.ts");

    test("APIs bloqueiam modificações e criações fora da Gestão XXV (2026.2) com HTTP 403", () => {
      const codeId = fs.readFileSync(routeIdPath, "utf-8");
      const codeList = fs.readFileSync(routeListPath, "utf-8");

      assert.ok(codeId.includes("Gestão XXV • 2026.2"), "Rota [id] deve restringir ações à Gestão XXV");
      assert.ok(codeId.includes("status: 403"), "Rota [id] deve retornar 403 para gestões passadas");

      assert.ok(codeList.includes("Gestão XXV • 2026.2"), "Rota de listagem/criação deve restringir criação à Gestão XXV");
      assert.ok(codeList.includes("status: 403"), "Rota de criação deve retornar 403 para outras gestões");
    });

    test("DELETE implementa cancelamento lógico padrão preservando histórico", () => {
      const codeId = fs.readFileSync(routeIdPath, "utf-8");
      assert.ok(codeId.includes("meetingsRepo.cancel(id)"), "DELETE sem permanent deve chamar cancelamento lógico");
      assert.ok(codeId.includes("meetingsRepo.delete(id)"), "DELETE com permanent=true chama exclusão com remoção de filhos");
    });
  });

  // 5. CONSELHO CONSULTIVO E TEXTO REMOVIDO
  describe("5. Conselho Consultivo", () => {
    const conselhoPagePath = path.join(rootDir, "app/(dashboard)/dashboard/conselho/page.tsx");

    test("Texto 'Estrutura e Competências' foi removido da apresentação do Conselho", () => {
      const code = fs.readFileSync(conselhoPagePath, "utf-8");
      assert.ok(!code.includes("Estrutura e Competências"), "Não deve conter o texto 'Estrutura e Competências'");
      assert.ok(!code.includes('activeTab === "lideranca"'), "Aba estática de liderança/competências deve estar ausente");
    });

    test("Preservação das 4 lojas patrocinadoras e quadro geral", () => {
      const code = fs.readFileSync(conselhoPagePath, "utf-8");
      assert.ok(code.includes("OFFICIAL_LODGES"), "Lojas oficiais devem estar presentes");
      assert.ok(code.includes("Caridade II"), "Caridade II presente");
      assert.ok(code.includes("Abolição"), "Abolição presente");
      assert.ok(code.includes("Adonhiran"), "Adonhiran presente");
      assert.ok(code.includes("Grande Mestre Alberto Mansur"), "Mansur presente");
    });
  });

  // 6. FILTROS DE ATAS CAPITULARES
  describe("6. Filtros de Atas Capitulares", () => {
    const docsPagePath = path.join(rootDir, "app/(dashboard)/dashboard/documentos/page.tsx");

    test("Filtro de Gestão / MC possui MC Rafael Inácio na Gestão XXV e layout responsivo", () => {
      const code = fs.readFileSync(docsPagePath, "utf-8");
      assert.ok(code.includes("Gestão XXV (2026.2) — MC Rafael Inácio"), "Opção deve conter MC Rafael Inácio");
      assert.ok(code.includes("min-w-[240px]"), "Select deve ter largura mínima para legibilidade");
      assert.ok(code.includes("flex-col sm:flex-row"), "Deve ser responsivo em mobile e desktop");
    });
  });

  // 7. REGRA DE MENSALIDADES — TIOS MAÇONS E JOSÉ AIRTON
  describe("7. Regra de Mensalidades — Tios Maçons e Isenção de José Airton", () => {
    const migrationPath = path.join(rootDir, "supabase/migrations/20261116000034_tiomacom_conselho_dues_rule.sql");
    const membroPagePath = path.join(rootDir, "app/(dashboard)/dashboard/membro/page.tsx");

    test("Migração 34 restringe mensalidade de Tio Maçom estritamente ao Conselho Consultivo", () => {
      assert.ok(fs.existsSync(migrationPath), "Migração 34 deve existir");
      const sql = fs.readFileSync(migrationPath, "utf-8");
      assert.ok(sql.includes("member_management_positions"), "Deve verificar vínculo em cargo");
      assert.ok(sql.includes("status = 'ativa'"), "Deve verificar gestão ativa");
      assert.ok(sql.includes("id_demolay <> '102836'"), "José Airton deve ser excluído da geração de mensalidades");
    });

    test("Painel do membro (/dashboard/membro) não apresenta dívidas de mensalidade para José Airton", () => {
      const code = fs.readFileSync(membroPagePath, "utf-8");
      assert.ok(
        code.includes('member.id_demolay === "102836"') || code.includes('currentMember.id_demolay === "102836"'),
        "Deve conter salvaguarda de isenção para ID 102836"
      );
      assert.ok(code.includes("setCharges([])"), "José Airton não recebe cobranças pendentes");
    });
  });
});
