import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Carrega variáveis do .env.local
const env = Object.fromEntries(
  fs.readFileSync(path.join(rootDir, ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
    })
);

const encodedPass = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
const connectionString = `postgresql://postgres.qvvmpskixyjbislcatso:${encodedPass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

describe("Auditoria e Homologação Técnica: Perfil do Membro, Tesouraria e Aprimoramentos Capitulares", () => {
  let dbClient;

  test("0. Conexão ao PostgreSQL e Preservação Estrita das 382 Cobranças Históricas", async () => {
    dbClient = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await dbClient.connect();

    const chargesCount = await dbClient.query("SELECT count(*) FROM public.member_charges;");
    assert.equal(
      parseInt(chargesCount.rows[0].count, 10),
      382,
      "As 382 cobranças históricas homologadas devem permanecer estritamente intactas"
    );
  });

  describe("1. Tesouraria: Correção da Listagem de DeMolays e Desbloqueio de Competências", () => {
    const tesourariaPath = path.join(rootDir, "app/(dashboard)/dashboard/tesouraria/page.tsx");

    test("1.1 Tesouraria possui aba dedicada para DeMolays Ativos (R$ 22,00)", () => {
      const code = fs.readFileSync(tesourariaPath, "utf-8");
      assert.ok(code.includes('activeSheet === "demolay"'), "Deve existir estado para aba demolay");
      assert.ok(code.includes("DeMolays Ativos"), "Deve exibir aba de DeMolays Ativos");
      assert.ok(code.includes("demolayCharges"), "Deve calcular lista de demolayCharges");
    });

    test("1.2 Lógica limitante de 'meses fechados / Exercício Financeiro Selecionado' foi eliminada", () => {
      const code = fs.readFileSync(tesourariaPath, "utf-8");
      assert.ok(!code.includes("Exercício Financeiro Selecionado"), "Texto limitante deve ser removido");
      assert.ok(!code.includes("• Vigente\" : \"• Fechado"), "Distinção de vigente/fechado como bloqueador deve ser removida");
      assert.ok(code.includes("Todas as Competências"), "Deve permitir consultar todas as competências");
    });

    test("1.3 Banner errôneo de 'DeMolays Isentos de Mensalidade' foi corrigido", () => {
      const code = fs.readFileSync(tesourariaPath, "utf-8");
      assert.ok(
        !code.includes("DeMolays e Sêniores: Isentos de Mensalidade"),
        "Banner que afirmava isenção indevida para DeMolays ativos deve ser eliminado"
      );
      assert.ok(code.includes("Mensalidade DeMolay"), "Deve exibir valor de mensalidade DeMolay");
    });

    test("1.4 Tesouraria possui suporte a seleção múltipla e barra de ações em lote", () => {
      const code = fs.readFileSync(tesourariaPath, "utf-8");
      assert.ok(code.includes("selectedChargeIds"), "Deve controlar IDs selecionados");
      assert.ok(code.includes("handleToggleSelectAll"), "Deve permitir selecionar todas as cobranças");
      assert.ok(code.includes("Dar Baixa em Lote"), "Deve possuir botão de baixa em lote");
      assert.ok(code.includes("Gerar PIX em Lote"), "Deve possuir botão de gerar PIX em lote");
    });

    test("1.5 API /api/charges/batch-confirm existe e valida autorização e idempotência", () => {
      const batchConfirmPath = path.join(rootDir, "app/api/charges/batch-confirm/route.ts");
      assert.ok(fs.existsSync(batchConfirmPath), "Rota batch-confirm deve existir");
      const code = fs.readFileSync(batchConfirmPath, "utf-8");
      assert.ok(code.includes("alreadyConfirmed"), "Deve verificar se alguma cobrança já está quitada");
      assert.ok(code.includes("payments"), "Deve registrar auditoria contábil na tabela payments");
    });
  });

  describe("2. Acesso Membro: Desbloqueio de Cobranças e Pagamento em Lote", () => {
    const membroPath = path.join(rootDir, "app/(dashboard)/dashboard/membro/page.tsx");

    test("2.1 Membro DeMolay visualiza suas cobranças legítimas sem anulação por conselho", () => {
      const code = fs.readFileSync(membroPath, "utf-8");
      assert.ok(
        !code.includes("if (!isConselhoAtivo)"),
        "A condição que anulava cobranças para DeMolays ativos fora do conselho deve ser removida"
      );
      assert.ok(code.includes("setCharges((chgRes.data as ChargeItem[]) || [])"), "Cobranças legítimas devem ser atribuídas");
    });

    test("2.2 Nomenclatura 'Assiduidade Litúrgica' foi substituída por 'Frequência'", () => {
      const code = fs.readFileSync(membroPath, "utf-8");
      assert.ok(!code.includes("Assiduidade & Frequência"), "Assiduidade & Frequência deve ser apenas Frequência");
      assert.ok(code.includes("Frequência"), "Deve conter Frequência");
    });
  });

  describe("3. Visão Geral do Dashboard", () => {
    const dashPath = path.join(rootDir, "app/(dashboard)/dashboard/page.tsx");

    test("3.1 Aviso 'Conexão Oficial Ativa - Sistema Ativo' foi completamente removido", () => {
      const code = fs.readFileSync(dashPath, "utf-8");
      assert.ok(!code.includes("Conexão Oficial Ativa"), "Conexão Oficial Ativa não deve existir na Visão Geral");
      assert.ok(!code.includes("Sistema Ativo"), "Sistema Ativo não deve existir no Header do Dashboard");
    });

    test("3.2 Termo 'Assiduidade Litúrgica' foi renomeado para 'Frequência'", () => {
      const code = fs.readFileSync(dashPath, "utf-8");
      assert.ok(!code.includes("Assiduidade Litúrgica"), "Termo Assiduidade Litúrgica deve ser substituído por Frequência");
      assert.ok(code.includes("Frequência"), "Deve exibir Frequência");
    });

    test("3.3 Consulta de Próxima Reunião não possui limit(10) que omitia o calendário", () => {
      const code = fs.readFileSync(dashPath, "utf-8");
      assert.ok(
        !code.includes('.from("meetings")\n            .select("id, title, starts_at, location, status, description")\n            .order("starts_at", { ascending: true })\n            .limit(10)'),
        "Consulta a meetings não deve limitar a 10 reuniões cortando o final do ano"
      );
    });
  });

  describe("4. Publicações e Atividades", () => {
    const pubPath = path.join(rootDir, "app/(dashboard)/dashboard/publicacoes/page.tsx");
    const ativPath = path.join(rootDir, "app/(dashboard)/dashboard/atividades/page.tsx");

    test("4.1 Modal de publicação possui botão e gerador de sugestão de legenda oficial", () => {
      const code = fs.readFileSync(pubPath, "utf-8");
      assert.ok(code.includes("handleSuggestCaption"), "Deve implementar função handleSuggestCaption");
      assert.ok(code.includes("Sugerir Legenda"), "Deve exibir botão de Sugerir Legenda");
      assert.ok(code.includes("#demolay #demolaybrasil #demolaypiaui"), "Deve conter hashtags oficiais");
      assert.ok(code.includes("#avantecn500 #cn500 #500e500"), "Deve conter hashtags capitulares");
    });

    test("4.2 Carrossel da Seção III possui suporte a loop contínuo infinito sem travamentos", () => {
      const code = fs.readFileSync(ativPath, "utf-8");
      assert.ok(code.includes("scrollRecentCarousel"), "Deve implementar navegação do carrossel");
      assert.ok(
        code.includes("scrollLeft + clientWidth >= scrollWidth - 15") && code.includes("scrollTo({ left: 0"),
        "Ao chegar ao final deve retornar ao início suavemente"
      );
      assert.ok(
        code.includes("scrollLeft <= 15") && code.includes("scrollTo({ left: Math.max(0, scrollWidth - clientWidth)"),
        "Ao retroceder do início deve retornar ao final suavemente"
      );
    });
  });

  describe("5. Perfil do Membro (Autoatendimento SISDM) e Imutabilidade Fundamental", () => {
    const perfilPath = path.join(rootDir, "app/(dashboard)/dashboard/perfil/page.tsx");
    const profileApiPath = path.join(rootDir, "app/api/member/profile/route.ts");

    test("5.1 Página /dashboard/perfil existe e possui todas as 11 seções (A a K)", () => {
      assert.ok(fs.existsSync(perfilPath), "app/(dashboard)/dashboard/perfil/page.tsx deve existir");
      const code = fs.readFileSync(perfilPath, "utf-8");
      assert.ok(code.includes("A. Dados Pessoais"), "Seção A deve existir");
      assert.ok(code.includes("B. Dados Familiares"), "Seção B deve existir");
      assert.ok(code.includes("C. Dados DeMolay"), "Seção C deve existir");
      assert.ok(code.includes("D. Minhas Organizações"), "Seção D deve existir");
      assert.ok(code.includes("E. Histórico de Cargos"), "Seção E deve existir");
      assert.ok(code.includes("F. Dados de Contato"), "Seção F deve existir");
      assert.ok(code.includes("G. Redes Sociais"), "Seção G deve existir");
      assert.ok(code.includes("H. Endereço Residencial"), "Seção H deve existir");
      assert.ok(code.includes("I. Segurança da Conta"), "Seção I deve existir");
      assert.ok(code.includes("K. Certificado de Regularidade"), "Seção K deve existir");
    });

    test("5.2 API /api/member/profile rejeita adulteração dos 3 campos imutáveis por membro comum", () => {
      const code = fs.readFileSync(profileApiPath, "utf-8");
      assert.ok(code.includes("Nome Completo é imutável"), "Deve proteger Nome Completo");
      assert.ok(code.includes("ID DeMolay é imutável"), "Deve proteger ID DeMolay");
      assert.ok(code.includes("Data de Nascimento já se encontra homologada"), "Deve proteger Data de Nascimento");
      assert.ok(code.includes("isMaster"), "Master deve ter permissão de correção");
    });

    test("5.3 Trigger trg_protect_immutable_member_fields está ativo no PostgreSQL", async () => {
      const trgRes = await dbClient.query(`
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE trigger_name = 'trg_protect_immutable_member_fields';
      `);
      assert.ok(trgRes.rows.length > 0, "Trigger trg_protect_immutable_member_fields deve existir no PostgreSQL");
    });

    test("5.4 Tabela public.members possui todas as novas colunas cadastradas", async () => {
      const colsRes = await dbClient.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'members' AND column_name IN (
          'cpf', 'rg', 'blood_type', 'blood_donor', 'bone_marrow_donor', 'organ_donor',
          'mother_name', 'father_name', 'father_is_mason', 'alternative_email',
          'address_cep', 'address_street', 'cover_photo_url'
        );
      `);
      assert.equal(colsRes.rows.length, 13, "Todas as 13 colunas de perfil auditadas devem existir na tabela members");
    });
  });

  test("99. Encerramento Conclusivo da Conexão de Banco", async () => {
    if (dbClient) {
      await dbClient.end();
    }
  });
});
