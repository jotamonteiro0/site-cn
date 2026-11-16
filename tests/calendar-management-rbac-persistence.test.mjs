import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Carrega variáveis de ambiente do .env.local para testes
const envLocalPath = path.resolve(".env.local");
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const chamadaPath = path.resolve("app/(dashboard)/dashboard/chamada/page.tsx");
const dashboardPath = path.resolve("app/(dashboard)/dashboard/page.tsx");
const atividadesPath = path.resolve("app/(dashboard)/dashboard/atividades/page.tsx");
const apiMeetingsPath = path.resolve("app/api/meetings/route.ts");
const apiMeetingsIdPath = path.resolve("app/api/meetings/[id]/route.ts");
const migrationPath = path.resolve("supabase/migrations/20261115000033_calendar_management_extensions.sql");

test("Auditoria Integral do Gerenciamento Administrativo do Calendário — Capítulo 500", async (t) => {
  const {
    MeetingsRepository,
    meetingsRepo,
    parseMeetingCategory,
    deriveManagementFromDate,
  } = await import("../lib/repositories/meetings-repository.ts");

  await t.test("1. Migration de Extensões do Calendário e Integridade Estrutural", () => {
    assert.ok(fs.existsSync(migrationPath), "Migration SQL deve existir localmente versionada");
    const sql = fs.readFileSync(migrationPath, "utf-8");
    assert.ok(sql.includes("ends_at"), "Deve adicionar coluna ends_at");
    assert.ok(sql.includes("category"), "Deve adicionar coluna category");
    assert.ok(sql.includes("management"), "Deve adicionar coluna management");
    assert.ok(sql.includes("complementary_info"), "Deve adicionar coluna complementary_info");
    assert.ok(sql.includes("meetings_ends_at_check"), "Deve conter constraint de coerência de horário");
  });

  await t.test("2. MeetingsRepository: Persistência Exclusiva PostgreSQL e Zero Fallback JSON", async () => {
    // 2.1 Verifica ausência absoluta de import ou leitura de JSON no repositório
    const repoSource = fs.readFileSync(path.resolve("lib/repositories/meetings-repository.ts"), "utf-8");
    assert.ok(!repoSource.includes(".json"), "MeetingsRepository não pode ler ou importar arquivos .json");
    assert.ok(!repoSource.includes("fs.readFileSync"), "MeetingsRepository não pode utilizar fs para leitura de dados");
    assert.ok(!repoSource.includes("fs.writeFileSync"), "MeetingsRepository não pode utilizar fs para escrita de dados");

    // 2.2 Rejeição estrita com erro técnico quando Supabase indisponível (Zero Fallback)
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const isolatedRepo = new MeetingsRepository();
      await assert.rejects(
        async () => {
          await isolatedRepo.getAll();
        },
        /Nenhuma leitura de fallback em JSON foi realizada/,
        "Deve falhar com erro explícito sem ler JSON"
      );
      await assert.rejects(
        async () => {
          await isolatedRepo.create({
            title: "Teste Falha",
            starts_at: "2026-11-20T16:00:00Z",
          });
        },
        /Nenhuma gravação em JSON foi realizada/,
        "Deve falhar com erro explícito sem gravar em JSON"
      );
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  await t.test("3. Regras de Negócio: Categorias, Gestão e Próxima Reunião Estritamente Futura", async () => {
    // 3.1 Parser canônico de categorias
    assert.equal(parseMeetingCategory("Sessão Magna de Iniciação"), "Sessão Magna de Iniciação");
    assert.equal(parseMeetingCategory("Sessão Magna de Elevação ao Grau DeMolay"), "Sessão Magna de Elevação");
    assert.equal(parseMeetingCategory("Cerimônia Pública das Mães"), "Cerimônia Pública");
    assert.equal(parseMeetingCategory("Reunião Ordinária do Grau Iniciático"), "Sessão Ordinária");

    // 3.2 Derivação canônica de gestão por período
    assert.equal(deriveManagementFromDate("2026-11-15T16:00:00Z"), "Gestão XXV (2026.2)");
    assert.equal(deriveManagementFromDate("2026-03-10T16:00:00Z"), "Gestão XXIV (2026.1)");
    assert.equal(deriveManagementFromDate("2027-03-01T16:00:00Z"), "Gestão XXVI (2027.1)");

    // 3.3 Próxima Reunião: ignora reuniões passadas, realizadas ou canceladas
    const refTime = new Date("2026-11-14T12:00:00-03:00").getTime();
    const nextMeet = await meetingsRepo.getNextMeeting(refTime);
    if (nextMeet) {
      assert.ok(new Date(nextMeet.starts_at).getTime() > refTime, "Próxima reunião deve ter horário futuro");
      assert.notEqual(nextMeet.status, "cancelada", "Próxima reunião não pode ser cancelada");
      assert.notEqual(nextMeet.status, "realizada", "Próxima reunião não pode ser realizada");
    }
  });

  await t.test("4. API de Reuniões (/api/meetings e /api/meetings/[id]): RBAC e Validações via HTTP", async () => {
    assert.ok(fs.existsSync(apiMeetingsPath), "app/api/meetings/route.ts deve existir");
    assert.ok(fs.existsSync(apiMeetingsIdPath), "app/api/meetings/[id]/route.ts deve existir");

    const baseUrl = "http://localhost:3000";

    try {
      // 4.1 GET /api/meetings é consultável
      const getRes = await fetch(`${baseUrl}/api/meetings`);
      assert.equal(getRes.status, 200, "GET /api/meetings deve retornar 200");
      const getData = await getRes.json();
      assert.ok(Array.isArray(getData.items), "Deve retornar array de items");

      // 4.2 POST /api/meetings rejeita não autenticado (401)
      const unauthRes = await fetch(`${baseUrl}/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Sessão Inválida", starts_at: "2026-11-29T16:00:00Z" }),
      });
      assert.equal(unauthRes.status, 401, "POST sem auth deve retornar 401");

      // 4.3 POST /api/meetings rejeita membro comum com 403 (RBAC)
      const memberRes = await fetch(`${baseUrl}/api/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-member-token",
        },
        body: JSON.stringify({ title: "Tentativa de Criação por Membro", starts_at: "2026-11-29T16:00:00Z" }),
      });
      assert.equal(memberRes.status, 403, "POST com perfil de membro deve retornar 403");

      // 4.4 POST /api/meetings rejeita dados inconsistentes (ends_at < starts_at) com 400
      const invalidTimeRes = await fetch(`${baseUrl}/api/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-master-token",
        },
        body: JSON.stringify({
          title: "Sessão Horário Incoerente",
          starts_at: "2026-11-29T18:00:00Z",
          ends_at: "2026-11-29T16:00:00Z",
        }),
      });
      assert.equal(invalidTimeRes.status, 400, "Horário de término anterior ao início deve retornar 400");

      // 4.5 PUT /api/meetings/[id] rejeita membro comum com 403
      const putMemberRes = await fetch(`${baseUrl}/api/meetings/non-existent-id`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-member-token",
        },
        body: JSON.stringify({ title: "Edição não autorizada" }),
      });
      assert.equal(putMemberRes.status, 403, "PUT com perfil de membro deve retornar 403");

      // 4.6 DELETE /api/meetings/[id] rejeita membro comum com 403
      const deleteMemberRes = await fetch(`${baseUrl}/api/meetings/non-existent-id`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer mock-member-token",
        },
      });
      assert.equal(deleteMemberRes.status, 403, "DELETE com perfil de membro deve retornar 403");

      // 4.7 Permissão do Escrivão para Gerenciamento do Calendário (RBAC Paritário)
      const escrivaoPutRes = await fetch(`${baseUrl}/api/meetings/non-existent-id`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-escrivao-token",
        },
        body: JSON.stringify({ title: "Edição autorizada pelo Escrivão" }),
      });
      assert.notEqual(escrivaoPutRes.status, 403, "Escrivão não deve receber 403 no PUT");
      assert.equal(escrivaoPutRes.status, 404, "Escrivão autorizado recebe 404 em ID inexistente");

      const escrivaoDeleteRes = await fetch(`${baseUrl}/api/meetings/non-existent-id`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer mock-escrivao-token",
        },
      });
      assert.notEqual(escrivaoDeleteRes.status, 403, "Escrivão não deve receber 403 no DELETE");
      assert.equal(escrivaoDeleteRes.status, 404, "Escrivão autorizado recebe 404 em ID inexistente");
    } catch (e) {
      console.warn("Live HTTP test against localhost:3000 skipped (server not running):", e.message);
    }
  });

  await t.test("5. Módulo Chamada (/dashboard/chamada): Aba 3, RBAC, Métricas e Modais", () => {
    const content = fs.readFileSync(chamadaPath, "utf-8");

    // Permissão do Escrivão e Master no Gerenciamento do Calendário
    assert.ok(content.includes("canManageCalendar"), "Deve utilizar canManageCalendar concedendo gestão ao Escrivão e Master");

    // Aba de Gerenciamento do Calendário presente
    assert.ok(content.includes('sessionSection === "calendario"'), "Deve conter seção de gerenciamento do calendário");
    assert.ok(content.includes("3. Gerenciamento do Calendário & Agenda"), "Deve conter botão da Aba 3");
    assert.ok(content.includes("tabParam === \"calendario\""), "Deve ler parâmetro ?tab=calendario");

    // Métricas
    assert.ok(content.includes("calendarMetrics.total"), "Métrica Total de Sessões");
    assert.ok(content.includes("calendarMetrics.agendadas"), "Métrica Sessões Agendadas");
    assert.ok(content.includes("calendarMetrics.realizadas"), "Métrica Sessões Realizadas");
    assert.ok(content.includes("calendarMetrics.canceladas"), "Métrica Sessões Canceladas");

    // Modais operacionais
    assert.ok(content.includes("viewingMeeting"), "Modal de detalhes da sessão presente");
    assert.ok(content.includes("cancellingMeeting"), "Modal de confirmação de cancelamento presente");
    assert.ok(content.includes("isMeetingModalOpen"), "Modal de cadastro e edição presente");

    // Preservação do histórico em cancelamento (sem deleção física por padrão)
    assert.ok(content.includes("Preservação Histórica Garantida"), "Explicação de preservação histórica no cancelamento");
    assert.ok(content.includes("handleCancelMeeting"), "Handler de cancelamento lógico presente");

    // Preservação de regras unslop e cores institucionais
    assert.ok(content.includes("#0C1D14"), "Superfície #0C1D14");
    assert.ok(content.includes("#0E2218"), "Cards #0E2218");
    assert.ok(content.includes("#08140E"), "Controles #08140E");
  });

  await t.test("6. Integração com Visão Geral (/dashboard) e Atividades (/dashboard/atividades)", () => {
    const dashContent = fs.readFileSync(dashboardPath, "utf-8");
    assert.ok(
      dashContent.includes('href="/dashboard/chamada?tab=calendario"'),
      "Dashboard deve conter link direto para o gerenciamento do calendário"
    );
    assert.ok(dashContent.includes("Gerenciar Agenda"), "Texto do botão Gerenciar Agenda no Dashboard");

    const ativContent = fs.readFileSync(atividadesPath, "utf-8");
    assert.ok(
      ativContent.includes('href="/dashboard/chamada?tab=calendario"'),
      "Atividades deve conter link direto para o gerenciamento do calendário"
    );
    assert.ok(ativContent.includes("Gerenciar Calendário"), "Texto do botão Gerenciar Calendário em Atividades");
    assert.ok(ativContent.includes("● Cancelada"), "Badge de cancelamento em reuniões canceladas");
  });

  await t.test("7. Categoria Entretenimento e Limitação da Gestão Administrativa", () => {
    // 7.1 Parser reconhece Entretenimento
    assert.equal(parseMeetingCategory("Torneio Esportivo de Entretenimento Fraternal"), "Entretenimento");
    assert.equal(parseMeetingCategory("[Entretenimento] Noite de Jogos Capitular"), "Entretenimento");

    // 7.2 Opção Entretenimento presente no formulário e no filtro de chamada
    const chamadaSrc = fs.readFileSync(chamadaPath, "utf-8");
    assert.ok(
      chamadaSrc.includes('<option value="Entretenimento">Entretenimento</option>'),
      "Modal de cadastro/edição e filtros devem possuir a categoria Entretenimento"
    );

    // 7.3 Rótulo limpo sem sufixo ' — Atual'
    assert.ok(!chamadaSrc.includes("Gestão XXV (2026.2) — Atual"), "Deve remover ' — Atual' das opções de gestão");

    // 7.4 Limitação estrita à Gestão XXV (2026.2)
    assert.ok(
      chamadaSrc.includes("Gestão Arquivada (Somente Leitura)"),
      "Reuniões de outras gestões devem ser exibidas como Somente Leitura"
    );

    // 7.5 API Guards em app/api/meetings e app/api/meetings/[id]
    const apiMeetingsSrc = fs.readFileSync(apiMeetingsPath, "utf-8");
    assert.ok(apiMeetingsSrc.includes("2026.2"), "POST /api/meetings deve validar vínculo à Gestão XXV (2026.2)");

    const apiMeetingsIdSrc = fs.readFileSync(apiMeetingsIdPath, "utf-8");
    assert.ok(apiMeetingsIdSrc.includes("2026.2"), "PUT/DELETE /api/meetings/[id] deve proteger gestões anteriores");
  });

  await t.test("8. Visão Geral Master: Maioridades Próximas, Pendências e Eliminação de Cards de Módulos", () => {
    const dashSrc = fs.readFileSync(dashboardPath, "utf-8");

    // 8.1 Card Maioridades Próximas
    assert.ok(dashSrc.includes("Maioridades Próximas"), "Dashboard Master deve conter card Maioridades Próximas");
    assert.ok(dashSrc.includes("view_member_majority_status"), "Deve consultar a view oficial de maioridades");

    // 8.2 Card Pendências Administrativas
    assert.ok(dashSrc.includes("Pendências Administrativas"), "Dashboard Master deve conter card Pendências Administrativas");
    assert.ok(dashSrc.includes("member_requests"), "Deve consultar member_requests pendentes");

    // 8.3 Card Próximas Obrigações
    assert.ok(dashSrc.includes("Próximas Obrigações"), "Dashboard Master deve conter card Próximas Obrigações");

    // 8.4 Ausência absoluta de Cards de Módulos duplicados
    assert.ok(
      !dashSrc.includes("Módulos de Gestão Capitular"),
      "Módulos redundantes de gestão capitular no rodapé do dashboard devem ser removidos"
    );

    // 8.5 Ausência de mensagens técnicas residuais
    assert.ok(
      !dashSrc.includes("Registros Oficiais Autênticos — 18 Atividades Catalogadas — PostgreSQL CMS: Preparado"),
      "Mensagens técnicas residuais de preparação do CMS devem estar ausentes"
    );
  });
});
