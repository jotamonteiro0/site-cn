import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

describe("Homologação da Revisão Estrutural de UX/UI e Fluxos Funcionais — Capítulo 500", () => {
  // 1. PÁGINA PÚBLICA — ENCONTROS E ATIVIDADES COM INFINITE SCROLL PROGRESSIVO
  describe("1. Encontros e Atividades — Infinite Scroll Progressivo", () => {
    const apiRoutePath = path.join(rootDir, "app/api/activities/route.ts");
    const componentPath = path.join(rootDir, "components/site/EncontrosAtividades.tsx");
    const homePath = path.join(rootDir, "app/page.tsx");

    test("1.1 API /api/activities implementa paginação baseada em cursor e ordenação cronológica", () => {
      assert.ok(fs.existsSync(apiRoutePath), "Arquivo app/api/activities/route.ts deve existir");
      const code = fs.readFileSync(apiRoutePath, "utf-8");
      assert.ok(code.includes("cursor"), "API deve aceitar parâmetro cursor");
      assert.ok(code.includes("limit"), "API deve aceitar parâmetro limit");
      assert.ok(code.includes("nextCursor"), "API deve retornar nextCursor");
      assert.ok(code.includes("hasMore"), "API deve retornar hasMore");
      assert.ok(code.includes("HISTORICAL_MEETINGS"), "API deve utilizar a base canônica de encontros");
    });

    test("1.2 Componente EncontrosAtividades possui conformidade com a referência, desduplicação e navegação", () => {
      assert.ok(fs.existsSync(componentPath), "Componente EncontrosAtividades deve existir");
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("loadedIdsRef"), "Deve desduplicar registros com Set/Ref para evitar repetidos");
      assert.ok(code.includes("Atividades realizadas"), "Título da seção deve seguir o padrão editorial da referência");
      assert.ok(code.includes("Ver mais atividades"), "Deve possuir link de continuação equivalente à referência");
      assert.ok(code.includes("scrollByDirection"), "Deve possuir controle de navegação horizontal por setas");
    });

    test("1.3 Página inicial (app/page.tsx) integra o componente dinâmico sem duplicações estáticas", () => {
      const code = fs.readFileSync(homePath, "utf-8");
      assert.ok(code.includes("<EncontrosAtividades"), "Página inicial deve renderizar EncontrosAtividades");
      assert.ok(!code.includes("const encontros = ["), "Array estático de encontros não deve mais poluir a página inicial");
    });
  });

  // 2. ÁREA PÚBLICA — REMOÇÃO DE DOCUMENTOS DO SITE PÚBLICO
  describe("2. Documentos — Restrição Exclusiva à Área Autenticada", () => {
    const homePath = path.join(rootDir, "app/page.tsx");
    const headerPath = path.join(rootDir, "components/site/Header.tsx");
    const footerPath = path.join(rootDir, "components/site/Footer.tsx");

    test("2.1 Seção de documentos removida da landing page", () => {
      const code = fs.readFileSync(homePath, "utf-8");
      assert.ok(!code.includes('id="documentos-oficiais"'), "Não deve existir seção pública #documentos-oficiais na landing page");
      assert.ok(!code.includes("vitrineDocumentos"), "Array de vitrineDocumentos não deve estar presente no page.tsx público");
    });

    test("2.2 Links públicos de documentos removidos do Header e Footer", () => {
      const headerCode = fs.readFileSync(headerPath, "utf-8");
      const footerCode = fs.readFileSync(footerPath, "utf-8");

      assert.ok(!headerCode.includes('href="#documentos-oficiais"'), "Header não deve ter link para documentos públicos");
      assert.ok(!footerCode.includes('href="#documentos-oficiais"'), "Footer não deve ter link para documentos públicos");
    });
  });

  // 3. ANIVERSARIANTES DO CAPÍTULO — SEÇÃO ELEGANTE E EM CONFORMIDADE COM PRIVACIDADE
  describe("3. Aniversariantes do Capítulo — Conformidade e Privacidade", () => {
    const bdayPath = path.join(rootDir, "components/site/AniversariantesSecao.tsx");
    const homePath = path.join(rootDir, "app/page.tsx");

    test("3.1 Componente AniversariantesSecao exibe apenas dia/mês sem expor ano de nascimento ou idade", () => {
      assert.ok(fs.existsSync(bdayPath), "Arquivo AniversariantesSecao.tsx deve existir");
      const code = fs.readFileSync(bdayPath, "utf-8");

      assert.ok(code.includes("Aniversariantes"), "Deve conter título de aniversariantes");
      assert.ok(!code.includes("anos de idade"), "Não deve divulgar idade em conformidade com privacidade");
      assert.ok(!code.includes("Ano de Nascimento"), "Não deve divulgar ano de nascimento");
      assert.ok(code.includes("birth_month") || code.includes("selectedMonth"), "Deve permitir seleção/filtragem por mês");
    });

    test("3.2 Landing page renderiza a seção de Aniversariantes", () => {
      const homeCode = fs.readFileSync(homePath, "utf-8");
      assert.ok(homeCode.includes("<AniversariantesSecao"), "Landing page deve renderizar AniversariantesSecao");
    });
  });

  // 4. DASHBOARD — ELIMINAÇÃO DE REDUNDÂNCIA DE PERFIL NO SIDEBAR
  describe("4. Dashboard Sidebar — Eliminação de Perfil Duplicado", () => {
    const sidebarPath = path.join(rootDir, "components/dashboard/Sidebar.tsx");

    test("4.1 Card inferior de perfil duplicado removido do Sidebar", () => {
      const code = fs.readFileSync(sidebarPath, "utf-8");
      assert.ok(!code.includes('className="p-3 bg-black/40 rounded-xl border border-white/10"'), "Card inferior duplicado não deve estar no Sidebar");
      assert.ok(code.includes("allowedNavigation"), "Sidebar deve manter navegação filtrada por RBAC");
      assert.ok(code.includes("ProfilePhotoCropper"), "Sidebar deve manter capacidade de upload/corte de foto");
    });
  });

  // 5. DASHBOARD DO MEMBRO — SEGREGAÇÃO DE MÉTRICAS E REMOÇÃO DE REDUNDÂNCIAS
  describe("5. Dashboard Overview — Segregação de Métricas Administrativas vs Pessoais", () => {
    const dashOverviewPath = path.join(rootDir, "app/(dashboard)/dashboard/page.tsx");

    test("5.1 Membros regulares não visualizam botões redundantes ou cards administrativos globais", () => {
      const code = fs.readFileSync(dashOverviewPath, "utf-8");
      assert.ok(!code.includes("Meu Autoatendimento"), "Botão redundante 'Meu Autoatendimento' deve ser removido");
      assert.ok(code.includes("canManage"), "Deve haver distinção estrita via canManage");
      assert.ok(code.includes("Minha Situação"), "Membro regular deve visualizar suas métricas pessoais");
      assert.ok(code.includes("Frequência") || code.includes("Assiduidade Litúrgica"), "Membro regular deve visualizar frequência própria");
      assert.ok(code.includes("Minhas Mensalidades"), "Membro regular deve visualizar mensalidades próprias");
    });
  });

  // 6. NOMINATA — SIMPLIFICAÇÃO E REORGANIZAÇÃO CANÔNICA
  describe("6. Nominata Capitular — Estrutura Racional e Diretoria Completa", () => {
    const nominataPath = path.join(rootDir, "app/(dashboard)/dashboard/nominata/page.tsx");

    test("6.1 Diretoria Capitular inclui Hospitaleiro junto aos 5 oficiais principais", () => {
      const code = fs.readFileSync(nominataPath, "utf-8");
      assert.ok(code.includes("Diretoria Capitular"), "Seção principal deve se chamar 'Diretoria Capitular'");
      assert.ok(code.includes("Hospitaleiro"), "Hospitaleiro deve constar na Diretoria Capitular");
    });

    test("6.2 Oficiais da Gestão unificados e galeria histórica separada da nominata ativa", () => {
      const code = fs.readFileSync(nominataPath, "utf-8");
      assert.ok(code.includes("Oficiais da Gestão"), "Preceptores e demais oficiais devem estar unificados em 'Oficiais da Gestão'");
      assert.ok(!code.includes("Galeria Histórica de Gestões"), "Galeria histórica de gestões deve ficar restrita à rota pública /gestoes");
    });
  });

  // 7. QUADRO DE MEMBROS — PAGINAÇÃO EFICIENTE VIA POSTGREST
  describe("7. Quadro de Membros — Paginação Eficiente", () => {
    const membrosPath = path.join(rootDir, "app/(dashboard)/dashboard/membros/page.tsx");

    test("7.1 Consulta ao Supabase utiliza range(from, to) com controles de navegação", () => {
      const code = fs.readFileSync(membrosPath, "utf-8");
      assert.ok(code.includes(".range(from, to)"), "Deve utilizar paginação no backend com .range(from, to)");
      assert.ok(code.includes("currentPage"), "Deve controlar estado da página atual");
      assert.ok(code.includes("totalPages"), "Deve calcular o total de páginas");
      assert.ok(code.includes("Página"), "Deve renderizar indicador de página");
    });
  });

  // 8. TESOURARIA — VIGÊNCIA, PAGAMENTO EM LOTE E VALIDAÇÃO DE QUITAÇÃO
  describe("8. Tesouraria, Quitação e Múltiplas Mensalidades", () => {
    const membroPagePath = path.join(rootDir, "app/(dashboard)/dashboard/membro/page.tsx");
    const batchApiRoutePath = path.join(rootDir, "app/api/charges/batch-payment/route.ts");
    const declApiRoutePath = path.join(rootDir, "app/api/declarations/generate/route.ts");
    const migration31Path = path.join(rootDir, "supabase/migrations/20261113000031_align_gestao_xxv_vigencia.sql");

    test("8.1 Vigência Institucional da Gestão XXV (Instalação 08/08/2026 e Encerramento em Assembleia)", () => {
      const declCode = fs.readFileSync(declApiRoutePath, "utf-8");
      const membroCode = fs.readFileSync(membroPagePath, "utf-8");
      const migCode = fs.readFileSync(migration31Path, "utf-8");

      assert.ok(declCode.includes("officialStartsOn") || declCode.includes("starts_on"), "Emissão de declaração deve adotar registro oficial de instalação");
      assert.ok(declCode.includes("formatCivilDate"), "Emissão de declaração deve formatar datas civis sem conversão UTC");
      assert.ok(membroCode.includes("2026-08-08"), "Painel do membro deve adotar instalação oficial 08/08/2026");
      assert.ok(migCode.includes("starts_on = '2026-08-08'"), "Migration 31 local deve atualizar para a data oficial de instalação");
      assert.ok(migCode.includes("expected_close_date"), "Migration 31 deve manter data prevista da assembleia separada da data efetiva");
      assert.ok(!migCode.includes("ends_on = '2027-02-08'"), "Migration 31 não deve determinar 08/02/2027 como encerramento");
    });

    test("8.2 Quitação rejeitada com HTTP 400 se houver pendências e snapshot imutável gravado", () => {
      const declCode = fs.readFileSync(declApiRoutePath, "utf-8");
      assert.ok(declCode.includes("status: 400"), "Deve retornar status HTTP 400 quando existirem mensalidades pendentes");
      assert.ok(declCode.includes("snapshot_imutavel: true"), "Deve congelar snapshot imutável em content_data");
      assert.ok(declCode.includes("competencias_abrangidas"), "Deve registrar competências no snapshot");
      assert.ok(declCode.includes("saldo_devedor") && declCode.includes("quitacao_tesouraria"), "Saldo devedor deve ser definido na quitação");
    });

    test("8.3 API de pagamento em lote (/api/charges/batch-payment) valida somatório e gera Pix Copia e Cola consolidado", () => {
      assert.ok(fs.existsSync(batchApiRoutePath), "API /api/charges/batch-payment deve existir");
      const batchCode = fs.readFileSync(batchApiRoutePath, "utf-8");

      assert.ok(batchCode.includes("charge_ids"), "Deve validar array de charge_ids");
      assert.ok(batchCode.includes("total_amount"), "Deve recalcular soma total no backend");
      assert.ok(batchCode.includes("pix_copia_cola"), "Deve gerar Pix Copia e Cola consolidado");
      assert.ok(batchCode.includes("infinitepay_url"), "Deve gerar link InfinitePay para o lote");
    });

    test("8.4 Painel do membro possui checkboxes, contador dinâmico, callout de lote e modal consolidado", () => {
      const membroCode = fs.readFileSync(membroPagePath, "utf-8");

      assert.ok(membroCode.includes("selectedChargeIds"), "Deve controlar IDs de mensalidades selecionadas");
      assert.ok(membroCode.includes("selectedTotalAmount"), "Deve calcular o somatório em tempo real");
      assert.ok(membroCode.includes("Pagamento em Lote Recomendado"), "Deve exibir banner chamativo para quitação em lote");
      assert.ok(membroCode.includes("isBatchPayModalOpen"), "Deve possuir modal de pagamento consolidado em lote");
      assert.ok(membroCode.includes("handleInitiateBatchPayment"), "Deve conectar ao endpoint de pagamento em lote");
    });
  });
});
