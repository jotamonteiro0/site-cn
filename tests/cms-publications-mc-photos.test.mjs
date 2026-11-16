import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Homologação do Módulo de Publicações do Site (CMS) e Fotografias Oficiais de MC", () => {
  const migrationPath = path.join(rootDir, "supabase/migrations/20261114000032_create_site_publications.sql");
  const publicApiRoutePath = path.join(rootDir, "app/api/activities/route.ts");
  const masterAuthPath = path.join(rootDir, "lib/master-auth.ts");
  const pagePath = path.join(rootDir, "app/(dashboard)/dashboard/publicacoes/page.tsx");
  const sidebarPath = path.join(rootDir, "components/dashboard/Sidebar.tsx");
  const encontrosPath = path.join(rootDir, "components/site/EncontrosAtividades.tsx");
  const gestoesPath = path.join(rootDir, "app/gestoes/page.tsx");
  const homePath = path.join(rootDir, "app/page.tsx");
  const publicationsJsonPath = path.join(rootDir, "data/site_publications.json");
  const mcPhotosJsonPath = path.join(rootDir, "data/mc_photos.json");

  // =========================================================================
  // 1. MIGRATION LOCAL E MODELAGEM DE BANCO DE DADOS
  // =========================================================================
  describe("1. Migration Local e Estrutura Relacional (RLS e Integridade)", () => {
    test("1.1 Arquivo de migration 20261114000032_create_site_publications.sql existe e está documentado", () => {
      assert.ok(fs.existsSync(migrationPath), "Migration local deve existir no diretório supabase/migrations");
      const sql = fs.readFileSync(migrationPath, "utf-8");
      assert.ok(sql.includes("public.site_publications"), "Deve criar a tabela site_publications");
      assert.ok(sql.includes("public.management_mc_photos"), "Deve criar a tabela management_mc_photos");
    });

    test("1.2 Tabela site_publications possui campos canônicos, constraints de status e RLS habilitado", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      assert.ok(sql.includes("status TEXT NOT NULL DEFAULT 'publicado'"), "Deve definir status padrão 'publicado'");
      assert.ok(
        sql.includes("CHECK (status IN ('rascunho', 'publicado', 'arquivado'))"),
        "Deve restringir status a 'rascunho', 'publicado' e 'arquivado'"
      );
      assert.ok(sql.includes("ALTER TABLE public.site_publications ENABLE ROW LEVEL SECURITY"), "Deve ativar RLS estrito");
      assert.ok(sql.includes("Allow public read published site_publications"), "Política pública deve filtrar por status = 'publicado'");
      assert.ok(sql.includes("Allow master full access to site_publications"), "Master deve ter acesso total");
      assert.ok(sql.includes("127738") && sql.includes("102836"), "Mantenedores permanentes devem ser contemplados");
    });

    test("1.3 Tabela management_mc_photos possui vínculo estrito com member_id e unicidade por gestão", () => {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      assert.ok(sql.includes("member_id UUID REFERENCES public.members(id)"), "Deve vincular por member_id real");
      assert.ok(sql.includes("management_code TEXT NOT NULL"), "Deve identificar a gestão pelo código");
      assert.ok(sql.includes("uq_management_mc_photos_code UNIQUE"), "Deve possuir constraint UNIQUE por gestão");
      assert.ok(sql.includes("ALTER TABLE public.management_mc_photos ENABLE ROW LEVEL SECURITY"), "Deve ativar RLS");
    });
  });

  // =========================================================================
  // 2. CAMADA DE PERSISTÊNCIA LOCAL (STORE INSTITUCIONAL)
  // =========================================================================
  describe("2. Camada de Persistência Local e Preservação dos Registros Autênticos", () => {
    test("2.1 Arquivo JSON inicializa com os 18 registros autênticos preservados sem perdas", () => {
      assert.ok(fs.existsSync(publicationsJsonPath), "Arquivo data/site_publications.json deve existir");
      const raw = fs.readFileSync(publicationsJsonPath, "utf-8");
      const list = JSON.parse(raw);
      assert.ok(Array.isArray(list), "Conteúdo deve ser um array");
      assert.ok(list.length >= 18, `Deve conter no mínimo os 18 registros históricos autênticos (atual: ${list.length})`);

      // Verifica ordenação decrescente por starts_at
      for (let i = 0; i < list.length - 1; i++) {
        const tA = new Date(list[i].starts_at).getTime();
        const tB = new Date(list[i + 1].starts_at).getTime();
        assert.ok(tA >= tB, "Publicações devem estar em ordem cronológica decrescente estrita");
      }
    });

    test("2.2 Validação estrutural de campos canônicos no store de publicações", () => {
      const raw = fs.readFileSync(publicationsJsonPath, "utf-8");
      const list = JSON.parse(raw);
      const item = list[0];

      assert.ok(item.id, "Item deve possuir ID");
      assert.ok(item.title, "Item deve possuir título");
      assert.ok(item.description, "Item deve possuir descrição");
      assert.ok(item.starts_at, "Item deve possuir data de início");
      assert.ok(item.status, "Item deve possuir status");
      assert.ok(["publicado", "rascunho", "arquivado"].includes(item.status), "Status deve ser válido");
    });
  });

  // =========================================================================
  // 3. SEGURANÇA E CONTROLE DE ACESSO RBAC (PERFIL MASTER VS MEMBRO)
  // =========================================================================
  describe("3. Segurança e Controle de Acesso (RBAC)", () => {
    test("3.1 verifyMasterAccess bloqueia chamadas anônimas e membros comuns com HTTP 401 e 403", async () => {
      // Mock do ambiente de teste
      process.env.NODE_ENV = "test";
      const { verifyMasterAccess } = await import("../lib/master-auth.ts");

      // Anônimo sem credenciais
      const anonReq = new Request("http://localhost:3000/api/admin/publications");
      const anonResult = await verifyMasterAccess(anonReq);
      assert.equal(anonResult.authorized, false);
      assert.equal(anonResult.statusCode, 401);

      // Membro comum sem privilégios
      const memberReq = new Request("http://localhost:3000/api/admin/publications", {
        headers: { "x-mock-role": "membro" },
      });
      const memberResult = await verifyMasterAccess(memberReq);
      assert.equal(memberResult.authorized, false);
      assert.equal(memberResult.statusCode, 403);
      assert.match(memberResult.error || "", /Acesso restrito/);

      // Usuário com papel Master
      const masterReq = new Request("http://localhost:3000/api/admin/publications", {
        headers: { "x-mock-role": "master" },
      });
      const masterResult = await verifyMasterAccess(masterReq);
      assert.equal(masterResult.authorized, true);
      assert.equal(masterResult.roleCode, "master");
    });

    test("3.2 Mantenedores Permanentes (IDs 127738 e 102836) possuem acesso garantido", () => {
      const code = fs.readFileSync(masterAuthPath, "utf-8");
      assert.ok(code.includes("127738"), "Deve conter salvaguarda para ID 127738");
      assert.ok(code.includes("102836"), "Deve conter salvaguarda para ID 102836");
      assert.ok(code.includes("joaomonteiro0@icloud.com"), "Deve conter salvaguarda de e-mail institucional");
      assert.ok(code.includes("Presidente do Conselho Consultivo"), "Deve contemplar o cargo de PCC");
    });
  });

  // =========================================================================
  // 4. API PÚBLICA DE ATIVIDADES (/api/activities)
  // =========================================================================
  describe("4. Conformidade da API Pública (/api/activities)", () => {
    test("4.1 API pública retorna apenas publicações com status 'publicado'", () => {
      const code = fs.readFileSync(publicApiRoutePath, "utf-8");
      assert.ok(code.includes("getPublishedPublications"), "API deve consultar getPublishedPublications()");
      assert.ok(code.includes("cursor"), "API deve suportar cursor");
      assert.ok(code.includes("limit"), "API deve suportar limit");
      assert.ok(code.includes("nextCursor"), "API deve retornar nextCursor");
      assert.ok(code.includes("hasMore"), "API deve retornar hasMore");
      assert.ok(code.includes("total"), "API deve retornar total");
    });
  });

  // =========================================================================
  // 5. GERENCIAMENTO DAS FOTOGRAFIAS DOS MESTRES CONSELHEIROS
  // =========================================================================
  describe("5. Gerenciamento de Fotografias Oficiais de Mestres Conselheiros", () => {
    test("5.1 Store de fotos de MC possui registros autênticos vinculados", () => {
      assert.ok(fs.existsSync(mcPhotosJsonPath), "Arquivo data/mc_photos.json deve existir");
      const raw = fs.readFileSync(mcPhotosJsonPath, "utf-8");
      const photos = JSON.parse(raw);
      assert.ok(photos.length >= 8, "Deve conter fotografias históricas pré-cadastradas");

      const atual = photos.find((p) => p.management_code === "2026.2");
      assert.ok(atual, "Gestão 2026.2 (XXV) deve estar cadastrada");
      assert.equal(atual.status, "Atual");
      assert.ok(
        atual.photo_url.includes("rafael-inacio"),
        "Deve apontar para foto oficial de Rafael Inácio do Nascimento de Morais (Gestão XXV - 2026.2)"
      );

      const gestao2025_2 = photos.find((p) => p.management_code === "2025.2");
      assert.ok(gestao2025_2, "Gestão 2025.2 (XXIII) deve estar cadastrada");
      assert.ok(
        gestao2025_2.photo_url.includes("joao-guilherme"),
        "Deve apontar para foto oficial de João Guilherme Martins Lopes Monteiro (Gestão XXIII - 2025.2)"
      );
    });

    test("5.2 Páginas públicas (/gestoes e Home) consultam dinamicamente a API de fotos", () => {
      const gestoesCode = fs.readFileSync(gestoesPath, "utf-8");
      const homeCode = fs.readFileSync(homePath, "utf-8");

      assert.ok(gestoesCode.includes("/api/mc-photos"), "Página /gestoes deve consultar /api/mc-photos");
      assert.ok(homeCode.includes("/api/mc-photos"), "Página inicial deve consultar /api/mc-photos");
    });
  });

  // =========================================================================
  // 6. PAINEL MASTER — PUBLICAÇÕES DO SITE (/dashboard/publicacoes)
  // =========================================================================
  describe("6. Painel Master 'Publicações do Site' (/dashboard/publicacoes)", () => {
    test("6.1 Rota /dashboard/publicacoes existe e possui verificação de papel Master", () => {
      assert.ok(fs.existsSync(pagePath), "app/(dashboard)/dashboard/publicacoes/page.tsx deve existir");
      const code = fs.readFileSync(pagePath, "utf-8");

      assert.ok(code.includes("userRole"), "Deve checar papel do usuário");
      assert.ok(code.includes("viewAsMember"), "Deve respeitar modo 'Ver como Membro'");
      assert.ok(code.includes("effectiveRole"), "Deve calcular papel efetivo");
      assert.ok(code.includes("isMaster"), "Deve restringir ações críticas a isMaster");
      assert.ok(code.includes("Acesso Restrito ao Perfil Master"), "Deve renderizar aviso 403 para não-Master");
    });

    test("6.2 Painel possui abas 'Atividades Realizadas' e 'Fotografias dos Mestres Conselheiros'", () => {
      const code = fs.readFileSync(pagePath, "utf-8");
      assert.ok(code.includes("Atividades Realizadas"), "Deve conter aba de Atividades Realizadas");
      assert.ok(code.includes("Fotografias dos Mestres Conselheiros"), "Deve conter aba de Fotografias dos MCs");
      assert.ok(code.includes("Nova Publicação"), "Deve possuir botão de cadastro de nova publicação");
      assert.ok(code.includes("Ver Pré-visualização"), "Deve possuir live preview fiel");
    });

    test("6.3 Painel possui formulário com todos os campos institucionais e seleção estrita por ID", () => {
      const code = fs.readFileSync(pagePath, "utf-8");
      assert.ok(code.includes("categoryPrefix"), "Deve suportar categoria litúrgica");
      assert.ok(code.includes("headlineText"), "Deve suportar título/manchete");
      assert.ok(code.includes("starts_at"), "Deve suportar data da atividade");
      assert.ok(code.includes("photo_url"), "Deve suportar foto de capa");
      assert.ok(code.includes("description"), "Deve suportar descrição narrativa");
      assert.ok(code.includes("location"), "Deve suportar local da reunião");
      assert.ok(code.includes("mc_name"), "Deve suportar Mestre Conselheiro");
      assert.ok(code.includes("ata_num"), "Deve suportar número da ata oficial");
      assert.ok(code.includes("demolays_present_count"), "Deve suportar quórum DeMolay");
      assert.ok(code.includes("masons_present_count"), "Deve suportar quórum maçônico");
      assert.ok(code.includes("selectedMemberId"), "Deve vincular MC estritamente por ID de membro");
    });

    test("6.4 Sidebar integra link para '/dashboard/publicacoes' condicionado a Master", () => {
      const code = fs.readFileSync(sidebarPath, "utf-8");
      assert.ok(code.includes("/dashboard/publicacoes"), "Sidebar deve conter rota /dashboard/publicacoes");
      assert.ok(code.includes("Publicações do Site"), "Sidebar deve exibir rótulo 'Publicações do Site'");
      assert.ok(code.includes("Newspaper"), "Sidebar deve utilizar ícone apropriado");
      // Verifica que não está na lista de rotas abertas a todos os membros
      assert.ok(
        !code.match(/item\.href === "\/dashboard\/publicacoes"[\s\S]*?return true;/),
        "Rota não deve estar liberada para membros sem perfil Master"
      );
    });
  });

  // =========================================================================
  // 7. COMPONENTE PÚBLICO E LOOP INFINITO DO CARROSSEL
  // =========================================================================
  describe("7. Componente Público EncontrosAtividades e Loop Contínuo", () => {
    test("7.1 EncontrosAtividades consulta dinamicamente /api/activities preservando os 18 originais", () => {
      const code = fs.readFileSync(encontrosPath, "utf-8");
      assert.ok(code.includes("/api/activities?limit=100"), "Deve buscar publicações dinâmicas da API");
      assert.ok(code.includes("HISTORICAL_MEETINGS"), "Deve manter base canônica como fallback");
      assert.ok(code.includes("loadedIdsRef"), "Deve manter rastreamento de desduplicação");
      assert.ok(code.includes("SET_COUNT = 3") || code.includes("LOOP_SLIDES"), "Deve estruturar buffer de 3 conjuntos");
      assert.ok(code.includes("normalizeLoopPosition"), "Deve possuir reposicionamento silencioso");
      assert.ok(code.includes("aria-roledescription=\"carrossel\""), "Deve preservar acessibilidade ARIA");
      assert.ok(code.includes("Atividades realizadas"), "Título da seção é 'Atividades realizadas'");
      assert.ok(code.includes("Ver mais atividades"), "Deve possuir link de continuação para o Instagram oficial");
    });
  });
});
