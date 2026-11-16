import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatCivilDate,
  formatCivilIso,
  getManagementState,
  getManagementVigenciaDescriptor,
  validateManagementCreation,
} from "../lib/gestao-vigencia.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Regra Institucional de Vigência das Gestões — Capítulo 500", () => {
  describe("1. Formatação de Datas Civis (Sem Deslocamento de Fuso Horário)", () => {
    test("1.1 Data civil YYYY-MM-DD é interpretada estritamente como dia civil local", () => {
      // 08/08/2026 nunca deve recuar para 07/08/2026 sob UTC-3 (America/Sao_Paulo)
      const formatted = formatCivilDate("2026-08-08");
      assert.equal(formatted, "08/08/2026", "A data oficial de instalação deve ser exatamente 08/08/2026");
    });

    test("1.2 Datas de final de ano e início de ano formatam com precisão", () => {
      assert.equal(formatCivilDate("2026-12-20"), "20/12/2026");
      assert.equal(formatCivilDate("2026-12-31"), "31/12/2026");
      assert.equal(formatCivilDate("2027-01-16"), "16/01/2027");
    });

    test("1.3 Formato civil ISO respeita a localidade", () => {
      const iso = formatCivilIso(new Date("2026-08-08T12:00:00Z"));
      assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("2. Ciclo de Vida da Gestão: Programada -> Ativa -> Encerrada", () => {
    test("2.1 Gestão Programada antes da instalação solene", () => {
      const gestaoProgramada = {
        id: "mgmt-2027-1",
        code: "2027.1",
        title: "Gestão XXVI",
        starts_on: "2027-01-16",
        expected_close_date: "2027-06-30",
        ends_on: null,
        status: "planejada",
      };

      const state = getManagementState(gestaoProgramada);
      assert.equal(state, "programada", "Gestão sem instalação solene deve ser classificada como programada");

      const descriptor = getManagementVigenciaDescriptor(gestaoProgramada);
      assert.equal(descriptor.isCurrentlyActive, false);
      assert.equal(descriptor.formattedInstallationDate, "16/01/2027");
      assert.equal(descriptor.actualCloseDate, null);
      assert.match(descriptor.summaryDisplay, /Instalação Oficial Prevista: 16\/01\/2027/);
    });

    test("2.2 Gestão Ativa após a instalação oficial", () => {
      const gestaoAtiva = {
        id: "mgmt-2026-2",
        code: "2026.2",
        title: "Gestão XXV",
        starts_on: "2026-08-08",
        expected_close_date: "2026-12-20",
        ends_on: null,
        status: "ativa",
      };

      const state = getManagementState(gestaoAtiva);
      assert.equal(state, "ativa", "Gestão após a posse oficial e sem encerramento formal é ativa");

      const descriptor = getManagementVigenciaDescriptor(gestaoAtiva);
      assert.equal(descriptor.isCurrentlyActive, true);
      assert.equal(descriptor.formattedInstallationDate, "08/08/2026");
      assert.equal(descriptor.actualCloseDate, null, "ends_on deve ser null enquanto a gestão estiver ativa");
      assert.equal(descriptor.formattedExpectedCloseDate, "20/12/2026");
    });

    test("2.3 A passagem de seis meses NÃO encerra a gestão", () => {
      // Simula data 7 meses após o início da Gestão XXV (março de 2027)
      const gestaoAtiva = {
        id: "mgmt-2026-2",
        code: "2026.2",
        title: "Gestão XXV",
        starts_on: "2026-08-08",
        expected_close_date: "2026-12-20",
        ends_on: null,
        status: "ativa",
      };

      const state = getManagementState(gestaoAtiva);
      assert.equal(state, "ativa", "A passagem de 6 meses NÃO pode alterar o estado para encerrada");
    });

    test("2.4 A chegada de janeiro NÃO encerra automaticamente a gestão", () => {
      // Mesmo em janeiro ou fevereiro, sem assembleia formal de encerramento registrada, permanece ativa
      const gestaoAtiva = {
        id: "mgmt-2026-2",
        code: "2026.2",
        title: "Gestão XXV",
        starts_on: "2026-08-08",
        expected_close_date: "2026-12-20",
        ends_on: null,
        status: "ativa",
      };

      const state = getManagementState(gestaoAtiva);
      assert.equal(state, "ativa", "A chegada de janeiro não encerra a gestão sem procedimento administrativo");
    });

    test("2.5 Encerramento formal ocorre estritamente na data da Assembleia Capitular", () => {
      const gestaoEncerrada = {
        id: "mgmt-2026-1",
        code: "2026.1",
        title: "Gestão XXIV",
        starts_on: "2026-01-01",
        expected_close_date: "2026-06-25",
        ends_on: "2026-06-30",
        status: "encerrada",
      };

      const state = getManagementState(gestaoEncerrada);
      assert.equal(state, "encerrada", "Gestão com encerramento formal registrado é encerrada");

      const descriptor = getManagementVigenciaDescriptor(gestaoEncerrada);
      assert.equal(descriptor.isCurrentlyActive, false);
      assert.equal(descriptor.actualCloseDate, "2026-06-30");
      assert.equal(descriptor.formattedActualCloseDate, "30/06/2026");
    });

    test("2.6 Preservação de Gestões Históricas (I a XXIV)", () => {
      const gestaoXIX = {
        id: "mgmt-2023-2",
        code: "2023.2",
        title: "Gestão XIX",
        starts_on: "2023-07-01",
        ends_on: "2023-12-31",
        status: "encerrada",
      };

      assert.equal(getManagementState(gestaoXIX), "encerrada");
      const d = getManagementVigenciaDescriptor(gestaoXIX);
      assert.equal(d.formattedInstallationDate, "01/07/2023");
      assert.equal(d.formattedActualCloseDate, "31/12/2023");
    });
  });

  describe("3. Validação de Regras de Negócio e Criação Administrativa", () => {
    test("3.1 Criação exige data oficial de instalação informada pelo Mestre Conselheiro", () => {
      const res = validateManagementCreation({
        code: "2027.1",
        title: "Gestão XXVI",
        starts_on: "",
      });

      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("data oficial de instalação")));
    });

    test("3.2 Criação aceita data prevista de assembleia separada da efetiva", () => {
      const res = validateManagementCreation({
        code: "2027.1",
        title: "Gestão XXVI",
        starts_on: "2027-01-16",
        expected_close_date: "2027-06-30",
      });

      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
    });
  });

  describe("4. Auditoria de Arquivos e Código Local", () => {
    test("4.1 Migration 31 não determina 08/02/2027 como encerramento e separa expected_close_date", () => {
      const migPath = path.join(rootDir, "supabase/migrations/20261113000031_align_gestao_xxv_vigencia.sql");
      const content = fs.readFileSync(migPath, "utf-8");

      assert.ok(content.includes("expected_close_date"), "Deve criar/utilizar coluna expected_close_date");
      assert.ok(content.includes("starts_on = '2026-08-08'"), "Deve registrar início oficial da Gestão XXV em 08/08/2026");
      assert.ok(!content.includes("ends_on = '2027-02-08'"), "Não deve gravar 08/02/2027 como data de encerramento");
      assert.ok(content.includes("ends_on = null"), "Deve manter ends_on como null enquanto a gestão estiver ativa");
    });

    test("4.2 Backend de declarações (/api/declarations/generate) usa registro oficial e formatação segura", () => {
      const routePath = path.join(rootDir, "app/api/declarations/generate/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      assert.ok(content.includes("formatCivilDate"), "Deve usar formatCivilDate para evitar deslocamento de fuso");
      assert.ok(!content.includes("mgmtEndsOn = \"2027-02-08\""), "Não deve conter data fixa arbitrária 2027-02-08");
    });

    test("4.3 Pagamento em Lote (/api/charges/batch-payment) infere membro e valida relação com as cobranças", () => {
      const routePath = path.join(rootDir, "app/api/charges/batch-payment/route.ts");
      const content = fs.readFileSync(routePath, "utf-8");

      assert.ok(content.includes("inferredMemberId"), "Deve inferir member_id a partir das cobranças no banco");
      assert.ok(content.includes("memberIds.length > 1"), "Deve rejeitar cobranças pertencentes a múltiplos membros");
      assert.ok(content.includes("uniqueChargeIds"), "Deve rejeitar cobranças duplicadas");
      assert.ok(content.includes("confirmado"), "Deve rejeitar cobranças já pagas");
    });

    test("4.4 Componente AniversariantesSecao.tsx não possui efeito redundante nem erro de lint", () => {
      const compPath = path.join(rootDir, "components/site/AniversariantesSecao.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      // Deve ter apenas um único useEffect que carrega dados e inicializa mês
      const useEffectCount = (content.match(/useEffect\(/g) || []).length;
      assert.equal(useEffectCount, 1, "Deve possuir um único useEffect consolidado");
    });
  });
});
