import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const conselhoPagePath = path.resolve("app/(dashboard)/dashboard/conselho/page.tsx");
const connectionString =
  "postgresql://postgres.qvvmpskixyjbislcatso:V9%23qL%4072%21mX%244zP%5E8wR%266kT%2A3nF%215jB@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_nlGgEKNZC0_fNuoYM9Og2A_HUyoJ-4G";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";

const CN500 = "00000000-0000-0000-0000-000000000500";
const OTHER_CHAPTER = "00000000-0000-0000-0000-000000000888";

test("Auditoria de Conformidade Unslop do Módulo Conselho Consultivo — Capítulo 500", async (t) => {
  const content = fs.readFileSync(conselhoPagePath, "utf8");

  // ==========================================================================
  // SEÇÃO 1: PRESERVAÇÃO RIGOROSA DE RBAC E SEPARAÇÃO DE PAPÉIS
  // ==========================================================================
  await t.test("1. Preservação Rigorosa de RBAC e Controle de Acesso", () => {
    // 1.1 Verificação de Papel e Modo Membro
    assert.ok(content.includes("userRole"), "Deve gerenciar userRole");
    assert.ok(content.includes("viewAsMember"), "Deve suportar viewAsMember");
    assert.ok(
      content.includes('effectiveRole = viewAsMember ? "membro" : userRole'),
      "effectiveRole deve alternar para membro se viewAsMember estiver ativo"
    );
    assert.ok(
      content.includes('canManage = effectiveRole === "master" || effectiveRole === "escrivao"'),
      "canManage deve autorizar estritamente master e escrivao"
    );

    // 1.2 Ações Administrativas Condicionadas
    assert.ok(
      content.includes("canManage && ("),
      "Botões operacionais de edição e alocação devem ser condicionados a canManage"
    );
    assert.ok(
      content.includes("isLodgeModalOpen && memberToEditLodge && canManage"),
      "Modal de alocação de loja deve exigir canManage"
    );
    assert.ok(
      content.includes("isOfficerModalOpen && officerToEdit && canManage"),
      "Modal de designação de liderança deve exigir canManage"
    );
    assert.ok(
      content.includes("if (!canManage) return;"),
      "Handlers de ação devem conter guarda estrita de autorização"
    );
  });

  // ==========================================================================
  // SEÇÃO 2: COMPOSIÇÃO DAS 4 LOJAS MAÇÔNICAS PATROCINADORAS
  // ==========================================================================
  await t.test("2. Composição Canônica das 4 Lojas Maçônicas Patrocinadoras", () => {
    // As 4 Lojas Oficiais Mantenedoras
    assert.ok(content.includes("A∴R∴L∴S∴ Abolição nº 4199"), "Deve conter a Loja Abolição 4199");
    assert.ok(content.includes("A∴R∴L∴S∴ Adonhiran nº 2782"), "Deve conter a Loja Adonhiran 2782");
    assert.ok(content.includes("A∴R∴L∴S∴ Caridade II nº 135"), "Deve conter a Loja Caridade II 135");
    assert.ok(
      content.includes("A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591"),
      "Deve conter a Loja Mansur 4591"
    );

    // Potência Oficial e Sede Capitular
    assert.ok(content.includes("GOB-PI"), "Potência deve ser identificada como GOB-PI");
    assert.ok(content.includes("Sede Capitular"), "Caridade II deve ser destacada como Sede Capitular");

    // Agrupamento estrito e contadores
    assert.ok(content.includes("lodgeMap"), "Deve organizar mapa de consultores por loja");
    assert.ok(content.includes("totalAllocated"), "Deve calcular o total de consultores alocados");
    assert.ok(content.includes("unallocatedMembers"), "Deve tratar consultores aguardando alocação");
  });

  // ==========================================================================
  // SEÇÃO 3: LIDERANÇA DO CONSELHO CONSULTIVO (GESTÃO ATIVA)
  // ==========================================================================
  await t.test("3. Liderança Oficial do Conselho Consultivo na Gestão Ativa", () => {
    assert.ok(
      content.includes("Presidente do Conselho Consultivo"),
      "Deve contemplar o cargo de Presidente do Conselho Consultivo (PCC)"
    );
    assert.ok(
      content.includes("Consultor da Organização"),
      "Deve contemplar o cargo de Consultor da Organização"
    );
    assert.ok(
      content.includes("set_nominata_officer"),
      "Deve invocar a função RPC oficial set_nominata_officer para designação atômica"
    );
  });

  // ==========================================================================
  // SEÇÃO 4: QUALIDADE VISUAL UNSLOP E TIPOGRAFIA
  // ==========================================================================
  await t.test("4. Qualidade Visual Unslop e Tipografia Tabular", () => {
    // Superfícies e bordas sólidas
    assert.ok(content.includes("bg-[#0D1815]"), "Superfície grafite-esmeralda escura");
    assert.ok(content.includes("border-[#1A2E26]"), "Borda discreta grafite-esmeralda");
    assert.ok(content.includes("text-[#D9AA45]"), "Dourado heráldico maçônico");

    // Tipografia Tabular
    assert.ok(content.includes("tabular-nums"), "Numerais tabulares para contadores e métricas");
    assert.ok(content.includes("font-mono"), "Fonte monoespaçada para IDs e indicadores");

    // Ausência de termos proibidos e IA Slop
    assert.ok(!content.includes("balaústre"), "Proibição estrita do termo maçônico proibido balaústre");
    assert.ok(!content.includes("from-purple-"), "Ausência de gradientes roxos genéricos");
    assert.ok(!content.includes("from-pink-"), "Ausência de gradientes rosa de IA");
  });

  // ==========================================================================
  // SEÇÃO 5: INTEGRIDADE DO BANCO DE DADOS E ISOLAMENTO MULTI-TENANT
  // ==========================================================================
  await t.test("5. Integridade do Banco de Dados e Isolamento Multi-Tenant", async () => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    try {
      // 5.1 Verificar se todos os maçons pertencem estritamente ao Capítulo 500
      const maconsRes = await client.query(
        "select count(*)::int as c from members where category = 'macom' and chapter_id = $1",
        [CN500]
      );
      assert.ok(maconsRes.rows[0].c >= 20, "Capítulo 500 deve possuir o corpo de maçons cadastrado");

      // 5.2 Isolamento multi-tenant: Nenhum maçom do Capítulo 500 deve vazar em outro capítulo
      const leakRes = await client.query(
        "select count(*)::int as c from members where category = 'macom' and chapter_id = $1",
        [OTHER_CHAPTER]
      );
      assert.equal(leakRes.rows[0].c, 0, "Nenhum maçom deve pertencer a outro capítulo não autorizado");

      // 5.3 As 4 Lojas Patrocinadoras Oficiais devem conter maçons vinculados
      const lodgesRes = await client.query(
        `select masonic_lodge, count(*)::int as c
         from members
         where chapter_id = $1 and masonic_lodge is not null
         group by masonic_lodge
         order by masonic_lodge`,
        [CN500]
      );
      const lodgeNames = lodgesRes.rows.map((r) => r.masonic_lodge);
      assert.ok(lodgeNames.includes("A∴R∴L∴S∴ Abolição nº 4199"), "Abolição 4199 deve existir no banco");
      assert.ok(lodgeNames.includes("A∴R∴L∴S∴ Adonhiran nº 2782"), "Adonhiran 2782 deve existir no banco");
      assert.ok(lodgeNames.includes("A∴R∴L∴S∴ Caridade II nº 135"), "Caridade II 135 deve existir no banco");
      assert.ok(
        lodgeNames.includes("A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591"),
        "Mansur 4591 deve existir no banco"
      );

      // 5.4 Liderança Ativa: Presidente do Conselho Consultivo na Gestão Ativa
      const activePccRes = await client.query(
        `select mp.name, m.full_name, m.id_demolay, m.masonic_lodge
         from member_management_positions mmp
         join management_positions mp on mp.id = mmp.management_position_id
         join managements mg on mg.id = mp.management_id
         join members m on m.id = mmp.member_id
         where mg.status = 'ativa' and mp.name = 'Presidente do Conselho Consultivo'`
      );
      assert.equal(activePccRes.rows.length, 1, "Deve existir exatamente 1 Presidente do Conselho ativo");
      assert.equal(activePccRes.rows[0].full_name, "Ericles Oliveira Guerra", "PCC ativo deve ser Ericles Guerra");
      assert.equal(activePccRes.rows[0].id_demolay, "91709", "ID DeMolay do PCC ativo deve ser 91709");

      // 5.5 View members_public deve ser consultável por cliente autenticado sem expor colunas privadas
      const viewColsRes = await client.query(
        `select column_name
         from information_schema.columns
         where table_name = 'members_public'`
      );
      const cols = viewColsRes.rows.map((c) => c.column_name);
      assert.ok(cols.includes("masonic_lodge"), "View members_public deve conter masonic_lodge");
      assert.ok(cols.includes("full_name"), "View members_public deve conter full_name");
      assert.ok(cols.includes("category"), "View members_public deve conter category");
      assert.ok(!cols.includes("email"), "View members_public NUNCA deve conter email");
      assert.ok(!cols.includes("phone"), "View members_public NUNCA deve conter phone");
    } finally {
      await client.end();
    }
  });

  // ==========================================================================
  // SEÇÃO 6: CONSULTA VIA SUPABASE REST (MEMBRO AUTENTICADO VS ANÔNIMO)
  // ==========================================================================
  await t.test("6. Consulta ao Conselho via Supabase Client (Segurança RLS)", async () => {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 6.1 Anônimo NÃO deve conseguir ler da view members_public (permissão revogada)
    const { error: anonViewErr } = await anonClient
      .from("members_public")
      .select("id, full_name, masonic_lodge");
    assert.ok(
      anonViewErr && anonViewErr.message.includes("permission denied"),
      "Anônimo deve ser negado com permission denied ao consultar members_public"
    );

    // 6.2 Admin / Service Role consegue carregar maçons do Capítulo 500
    const { data: adminData, error: adminErr } = await adminClient
      .from("members")
      .select("id, id_demolay, full_name, category, masonic_lodge")
      .eq("chapter_id", CN500)
      .eq("category", "macom");

    assert.ifError(adminErr);
    assert.ok(adminData && adminData.length >= 20, "Deve retornar lista de maçons do Capítulo 500");

    // 6.3 Consulta direcionada a outro capítulo deve retornar 0 registros
    const { data: otherData, error: otherErr } = await adminClient
      .from("members")
      .select("id")
      .eq("chapter_id", OTHER_CHAPTER)
      .eq("category", "macom");

    assert.ifError(otherErr);
    assert.equal(otherData.length, 0, "Outro capítulo não deve retornar maçons");
  });

  // ==========================================================================
  // SEÇÃO 7: AUDITORIA DE SEGURANÇA E ISOLAMENTO MULTI-TENANT EM OPERAÇÕES DE ESCRITA
  // ==========================================================================
  await t.test("7. Auditoria de Segurança: Isolamento de Atualizações e Permissões do Banco", async () => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    try {
      await client.query("BEGIN");

      const externalUserId = "40000000-0000-0000-0000-000000000099";
      const targetMemberId = "ec83b64e-b869-4b68-a9be-97e240ecd59e"; // Alrandy Cleston (CN500)

      // Provisiona temporariamente capítulo externo e usuário vinculado
      await client.query(`
        insert into chapters (id, slug, name, number, is_public, is_active)
        values ('${OTHER_CHAPTER}', 'cap-ext-test-audit', 'Capítulo Externo Audit', 888, true, true)
        on conflict (id) do nothing;
        insert into auth.users (id, aud, role, email)
        values ('${externalUserId}', 'authenticated', 'authenticated', 'audit.ext@cn.test')
        on conflict (id) do nothing;
        insert into chapter_memberships (chapter_id, user_id, role_code, is_active)
        values ('${OTHER_CHAPTER}', '${externalUserId}', 'membro', true)
        on conflict (chapter_id, user_id) do nothing;
      `);

      // Simula sessão PostgREST de usuário externo sob papel authenticated
      await client.query("SET LOCAL ROLE authenticated;");
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${externalUserId}"}';`);

      // 7.1 Tentativa de alteração de masonic_lodge em registro do Capítulo 500 por usuário externo
      const updateRes = await client.query(`
        update public.members
        set masonic_lodge = 'LOJA EXTERNA FRAUDULENTA'
        where id = '${targetMemberId}';
      `);
      assert.equal(
        updateRes.rowCount,
        0,
        "Usuário de outro capítulo deve ter estritamente 0 linhas afetadas ao tentar alterar membros do Capítulo 500"
      );

      // 7.2 Tentativa de leitura de dados de membros do Capítulo 500 por usuário externo na tabela base
      const readBaseRes = await client.query(`
        select count(*)::int as c from public.members where chapter_id = '${CN500}';
      `);
      assert.equal(
        readBaseRes.rows[0].c,
        0,
        "Usuário de outro capítulo não deve conseguir visualizar registros do Capítulo 500 na tabela base"
      );

      // 7.3 Tentativa de leitura na view members_public por usuário externo
      const readViewRes = await client.query(`
        select count(*)::int as c from public.members_public where chapter_id = '${CN500}';
      `);
      assert.equal(
        readViewRes.rows[0].c,
        0,
        "Usuário de outro capítulo deve receber 0 registros do Capítulo 500 na view members_public"
      );

      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  // ==========================================================================
  // SEÇÃO 8: AUDITORIA DE SEGURANÇA MANDATÓRIA (10 CENÁRIOS REAIS)
  // ==========================================================================
  await t.test("8. Auditoria Mandatória: 10 Cenários de Permissão, RLS e RPC", async (st) => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const activeMgmtId = "00000000-0000-0000-0000-000000002026";
    const targetMemberId = "ec83b64e-b869-4b68-a9be-97e240ecd59e"; // Alrandy Cleston (CN500)

    const uids = {
      common: "80000000-0000-0000-0000-000000000001",
      otherChapter: "80000000-0000-0000-0000-000000000002",
      escrivao: "80000000-0000-0000-0000-000000000003",
      master: "80000000-0000-0000-0000-000000000004",
    };

    const memberIds = {
      common: "81000000-0000-0000-0000-000000000001",
      otherChapter: "81000000-0000-0000-0000-000000000002",
      escrivao: "81000000-0000-0000-0000-000000000003",
      master: "81000000-0000-0000-0000-000000000004",
      inactive: "81000000-0000-0000-0000-000000000005",
    };

    try {
      await client.query("BEGIN");

      // Setup fixtures
      await client.query(`
        insert into chapters (id, slug, name, number, is_public, is_active)
        values ('${OTHER_CHAPTER}', 'cap-ext-audit-10', 'Capítulo Externo 888', 888, true, true)
        on conflict (id) do nothing;

        -- Common user & member
        insert into auth.users (id, aud, role, email)
        values ('${uids.common}', 'authenticated', 'authenticated', 'common@cn500.test')
        on conflict (id) do nothing;
        insert into members (id, chapter_id, full_name, category, is_active, profile_id, masonic_lodge)
        values ('${memberIds.common}', '${CN500}', 'Membro Comum Auditoria', 'macom', true, '${uids.common}', 'A∴R∴L∴S∴ Abolição nº 4199')
        on conflict (id) do nothing;
        insert into chapter_memberships (chapter_id, user_id, member_id, role_code, is_active)
        values ('${CN500}', '${uids.common}', '${memberIds.common}', 'membro', true)
        on conflict (chapter_id, user_id) do update set role_code = 'membro', is_active = true;

        -- Other chapter user & member
        insert into auth.users (id, aud, role, email)
        values ('${uids.otherChapter}', 'authenticated', 'authenticated', 'other@chapter.test')
        on conflict (id) do nothing;
        insert into members (id, chapter_id, full_name, category, is_active, profile_id, masonic_lodge)
        values ('${memberIds.otherChapter}', '${OTHER_CHAPTER}', 'Membro Outro Cap', 'macom', true, '${uids.otherChapter}', 'Loja Estranha')
        on conflict (id) do nothing;
        insert into chapter_memberships (chapter_id, user_id, member_id, role_code, is_active)
        values ('${OTHER_CHAPTER}', '${uids.otherChapter}', '${memberIds.otherChapter}', 'membro', true)
        on conflict (chapter_id, user_id) do update set role_code = 'membro', is_active = true;

        -- Escrivão user & member
        insert into auth.users (id, aud, role, email)
        values ('${uids.escrivao}', 'authenticated', 'authenticated', 'escrivao@cn500.test')
        on conflict (id) do nothing;
        insert into members (id, chapter_id, full_name, category, is_active, profile_id, masonic_lodge)
        values ('${memberIds.escrivao}', '${CN500}', 'Escrivão Auditoria', 'senior', true, '${uids.escrivao}', null)
        on conflict (id) do nothing;
        insert into chapter_memberships (chapter_id, user_id, member_id, role_code, is_active)
        values ('${CN500}', '${uids.escrivao}', '${memberIds.escrivao}', 'escrivao', true)
        on conflict (chapter_id, user_id) do update set role_code = 'escrivao', is_active = true;

        -- Master user & member
        insert into auth.users (id, aud, role, email)
        values ('${uids.master}', 'authenticated', 'authenticated', 'master@cn500.test')
        on conflict (id) do nothing;
        insert into members (id, chapter_id, full_name, category, is_active, profile_id, masonic_lodge)
        values ('${memberIds.master}', '${CN500}', 'Master Auditoria', 'ativo', true, '${uids.master}', null)
        on conflict (id) do nothing;
        insert into chapter_memberships (chapter_id, user_id, member_id, role_code, is_active)
        values ('${CN500}', '${uids.master}', '${memberIds.master}', 'master', true)
        on conflict (chapter_id, user_id) do update set role_code = 'master', is_active = true;

        -- Inactive member in CN500
        insert into members (id, chapter_id, full_name, category, is_active, masonic_lodge)
        values ('${memberIds.inactive}', '${CN500}', 'Membro Inativo CN500', 'macom', false, null)
        on conflict (id) do nothing;
      `);

      // 1. Chamada direta de anon à função set_nominata_officer (deve falhar)
      await st.test("Cenário 1: Chamada direta de anon à função set_nominata_officer falha", async () => {
        // Via Supabase HTTP / PostgREST RPC
        const { error: anonRpcErr } = await anonClient.rpc("set_nominata_officer", {
          p_management_id: activeMgmtId,
          p_position_name: "Sentinela",
          p_member_id: targetMemberId,
        });
        assert.ok(anonRpcErr, "RPC chamado por anon deve retornar erro");
        assert.ok(
          anonRpcErr.message.includes("permission denied"),
          `Erro deve indicar permission denied, recebido: ${anonRpcErr.message}`
        );

        // Via SQL direto com papel anon
        await client.query("SAVEPOINT sp_anon");
        await client.query("SET LOCAL ROLE anon;");
        let sqlAnonErr = null;
        try {
          await client.query(
            `select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Sentinela', '${targetMemberId}'::uuid)`
          );
        } catch (e) {
          sqlAnonErr = e.message;
          await client.query("ROLLBACK TO SAVEPOINT sp_anon");
        }
        assert.ok(sqlAnonErr && sqlAnonErr.includes("permission denied"), "Anon deve ser negado no SQL");
      });

      // 2. Chamada de membro autenticado sem papel administrativo à função set_nominata_officer (deve falhar)
      await st.test("Cenário 2: Membro autenticado sem papel administrativo é bloqueado", async () => {
        await client.query("SAVEPOINT sp_nonadmin");
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.common}"}';`);
        let nonAdminErr = null;
        try {
          await client.query(
            `select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Sentinela', '${memberIds.common}'::uuid)`
          );
        } catch (e) {
          nonAdminErr = e.message;
          await client.query("ROLLBACK TO SAVEPOINT sp_nonadmin");
        }
        assert.ok(
          nonAdminErr && nonAdminErr.includes("Permissão negada"),
          `Membro comum deve receber Permissão negada, recebido: ${nonAdminErr}`
        );
      });

      // 3. Tentativa de membro comum atualizar a própria masonic_lodge ou category via PostgREST/Supabase (0 linhas afetadas)
      await st.test("Cenário 3: Membro comum tentando atualizar masonic_lodge/category tem 0 linhas afetadas", async () => {
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.common}"}';`);
        const updateRes = await client.query(`
          update public.members
          set masonic_lodge = 'LOJA FRAUDULENTA', category = 'consultor'
          where id = '${memberIds.common}';
        `);
        assert.equal(updateRes.rowCount, 0, "Membro comum deve ter estritamente 0 linhas afetadas em UPDATE");
      });

      // 4. Tentativa de usuário de outro capítulo alterar dados de membros do Capítulo 500 (0 linhas afetadas)
      await st.test("Cenário 4: Usuário de outro capítulo tentando alterar CN500 tem 0 linhas afetadas", async () => {
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.otherChapter}"}';`);
        const updateRes = await client.query(`
          update public.members
          set masonic_lodge = 'LOJA HACKEADA'
          where id = '${targetMemberId}';
        `);
        assert.equal(updateRes.rowCount, 0, "Usuário de outro capítulo deve ter estritamente 0 linhas afetadas");
      });

      // 5. Execução bem-sucedida da função set_nominata_officer por um Escrivão autorizado
      await st.test("Cenário 5: Execução bem-sucedida da função por Escrivão autorizado", async () => {
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.escrivao}"}';`);
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Sentinela', '${targetMemberId}'::uuid) as r;
        `);
        const result = res.rows[0].r;
        assert.equal(result.success, true, "Escrivão deve executar com sucesso");
        assert.equal(result.position_name, "Sentinela", "Cargo deve ser Sentinela");
      });

      // 6. Execução bem-sucedida da função set_nominata_officer por um Master autorizado
      await st.test("Cenário 6: Execução bem-sucedida da função por Master autorizado", async () => {
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.master}"}';`);
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Presidente do Conselho Consultivo', '${memberIds.master}'::uuid) as r;
        `);
        const result = res.rows[0].r;
        assert.equal(result.success, true, "Master deve executar com sucesso");
        assert.equal(result.position_name, "Presidente do Conselho Consultivo");
        assert.equal(result.assigned_role, "master");
        assert.equal(result.synchronized_with_rbac, true, "Membro com conta Auth ativa deve sincronizar com RBAC");
      });

      // 7. Tentativa de atribuir cargo fora da whitelist (deve ser rejeitada)
      await st.test("Cenário 7: Rejeição de cargo arbitrário fora da whitelist", async () => {
        await client.query("SAVEPOINT sp_whitelist");
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.master}"}';`);
        let whitelistErr = null;
        try {
          await client.query(`
            select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Cargo Inventado Fake', '${targetMemberId}'::uuid);
          `);
        } catch (e) {
          whitelistErr = e.message;
          await client.query("ROLLBACK TO SAVEPOINT sp_whitelist");
        }
        assert.ok(
          whitelistErr && whitelistErr.includes("Cargo inválido"),
          `Deve rejeitar com Cargo inválido, recebido: ${whitelistErr}`
        );
      });

      // 8. Tentativa de vincular membro inativo ou de outro capítulo a uma gestão (deve ser rejeitada)
      await st.test("Cenário 8: Rejeição de membro de outro capítulo ou inativo", async () => {
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.master}"}';`);

        // 8a: Membro de outro capítulo
        await client.query("SAVEPOINT sp_other_mem");
        let otherMemErr = null;
        try {
          await client.query(`
            select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Sentinela', '${memberIds.otherChapter}'::uuid);
          `);
        } catch (e) {
          otherMemErr = e.message;
          await client.query("ROLLBACK TO SAVEPOINT sp_other_mem");
        }
        assert.ok(
          otherMemErr && otherMemErr.includes("Membro inválido"),
          `Deve rejeitar membro de outro capítulo, recebido: ${otherMemErr}`
        );

        // 8b: Membro inativo
        await client.query("SAVEPOINT sp_inact_mem");
        let inactiveMemErr = null;
        try {
          await client.query(`
            select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Sentinela', '${memberIds.inactive}'::uuid);
          `);
        } catch (e) {
          inactiveMemErr = e.message;
          await client.query("ROLLBACK TO SAVEPOINT sp_inact_mem");
        }
        assert.ok(
          inactiveMemErr && inactiveMemErr.includes("Membro inválido"),
          `Deve rejeitar membro inativo, recebido: ${inactiveMemErr}`
        );
      });

      // 9. Comprovação de que a atualização de membros por Master e Escrivão continua funcionando normalmente
      await st.test("Cenário 9: Atualização legítima de membros por Master e Escrivão funciona", async () => {
        await client.query("SET LOCAL ROLE authenticated;");

        // Master update
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.master}"}';`);
        const masterUpdateRes = await client.query(`
          update public.members
          set masonic_lodge = 'A∴R∴L∴S∴ Caridade II nº 135'
          where id = '${targetMemberId}';
        `);
        assert.equal(masterUpdateRes.rowCount, 1, "Master deve atualizar com sucesso o membro");

        // Escrivão update
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.escrivao}"}';`);
        const escrivaoUpdateRes = await client.query(`
          update public.members
          set masonic_lodge = 'A∴R∴L∴S∴ Abolição nº 4199'
          where id = '${targetMemberId}';
        `);
        assert.equal(escrivaoUpdateRes.rowCount, 1, "Escrivão deve atualizar com sucesso o membro");
      });

      // 10. Comprovação de que a leitura de dados públicos por membros comuns permanece segura e restrita
      await st.test("Cenário 10: Consulta a dados públicos por membro comum permanece segura", async () => {
        await client.query("SET LOCAL ROLE authenticated;");
        await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${uids.common}"}';`);

        // Leitura via members_public
        const viewRes = await client.query(`
          select id, full_name, category, masonic_lodge
          from public.members_public
          where chapter_id = '${CN500}';
        `);
        assert.ok(viewRes.rows.length >= 20, "Membro comum consulta view pública do capítulo normalmente");

        // Tabela base members: membro comum só vê seu próprio registro
        const baseRes = await client.query(`
          select id, full_name, email from public.members;
        `);
        assert.equal(baseRes.rows.length, 1, "Membro comum só enxerga o seu próprio registro na tabela base");
        assert.equal(baseRes.rows[0].id, memberIds.common, "Registro visível é estritamente o seu próprio");
      });

      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  // ==========================================================================
  // SEÇÃO 9: AUDITORIA DE REVOGAÇÃO ATÔMICA, MÚLTIPLAS NOMEAÇÕES E RBAC RIGOROSO
  // ==========================================================================
  await t.test("9. Auditoria Avançada: Revogação Atômica de RBAC e Múltiplas Nomeações", async (st) => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const activeMgmtId = "00000000-0000-0000-0000-000000002026";

    // 9.1 Hardening defensivo de privilégios em chapter_memberships
    await st.test("9.1. Hardening de chapter_memberships: ausência de privilégios DML para anon", async () => {
      const grantsRes = await client.query(`
        select privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = 'chapter_memberships'
          and grantee = 'anon';
      `);
      const privs = grantsRes.rows.map(r => r.privilege_type);
      assert.ok(!privs.includes("INSERT"), "anon NÃO deve ter permissão INSERT em chapter_memberships");
      assert.ok(!privs.includes("UPDATE"), "anon NÃO deve ter permissão UPDATE em chapter_memberships");
      assert.ok(!privs.includes("DELETE"), "anon NÃO deve ter permissão DELETE em chapter_memberships");
      assert.ok(!privs.includes("TRUNCATE"), "anon NÃO deve ter permissão TRUNCATE em chapter_memberships");
    });

    try {
      await client.query("BEGIN");

      // Fixtures temporárias para os testes de RBAC avançado
      const masterUid = "90000000-0000-0000-0000-000000000001";
      const masterMid = "91000000-0000-0000-0000-000000000001";

      const broAUid = "90000000-0000-0000-0000-000000000002";
      const broAMid = "91000000-0000-0000-0000-000000000002";

      const broBUid = "90000000-0000-0000-0000-000000000003";
      const broBMid = "91000000-0000-0000-0000-000000000003";

      await client.query(`
        insert into auth.users (id, aud, role, email) values
        ('${masterUid}', 'authenticated', 'authenticated', 'master9@test.local'),
        ('${broAUid}', 'authenticated', 'authenticated', 'broA9@test.local'),
        ('${broBUid}', 'authenticated', 'authenticated', 'broB9@test.local')
        on conflict (id) do nothing;

        insert into members (id, chapter_id, full_name, category, is_active, profile_id, id_demolay) values
        ('${masterMid}', '${CN500}', 'Master Auditoria 9', 'ativo', true, '${masterUid}', '99901'),
        ('${broAMid}', '${CN500}', 'Brother A Auditoria', 'macom', true, '${broAUid}', '99902'),
        ('${broBMid}', '${CN500}', 'Brother B Auditoria', 'macom', true, '${broBUid}', '99903')
        on conflict (id) do nothing;

        insert into chapter_memberships (chapter_id, user_id, member_id, role_code, is_active) values
        ('${CN500}', '${masterUid}', '${masterMid}', 'master', true),
        ('${CN500}', '${broAUid}', '${broAMid}', 'membro', true),
        ('${CN500}', '${broBUid}', '${broBMid}', 'membro', true)
        on conflict (chapter_id, user_id) do update set role_code = excluded.role_code;
      `);

      await client.query("SET LOCAL ROLE authenticated;");
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${masterUid}"}';`);

      // 9.2 Preservação do Acesso Master do PCC
      await st.test("9.2. Preservação do Acesso Master do PCC (Presidente do Conselho)", async () => {
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Presidente do Conselho Consultivo', '${broAMid}'::uuid) as r;
        `);
        const r = res.rows[0].r;
        assert.equal(r.success, true);
        assert.equal(r.assigned_role, "master");
        assert.equal(r.synchronized_with_rbac, true);

        const memRes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broAUid}';
        `);
        assert.equal(memRes.rows[0].role_code, "master", "PCC deve receber acesso Master no RBAC");
      });

      // 9.3 Transferência de cargo entre dois membros (Substituição: A para B)
      await st.test("9.3. Transferência de cargo entre dois membros (Substituição: A para B)", async () => {
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Presidente do Conselho Consultivo', '${broBMid}'::uuid) as r;
        `);
        const r = res.rows[0].r;
        assert.equal(r.success, true);
        assert.equal(r.member_id, broBMid);
        assert.equal(r.synchronized_with_rbac, true);

        const memARes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broAUid}';
        `);
        const memBRes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broBUid}';
        `);
        assert.equal(memARes.rows[0].role_code, "membro", "Titular anterior A deve ser rebaixado para membro");
        assert.equal(memBRes.rows[0].role_code, "master", "Novo titular B deve ser promovido a master");
      });

      // 9.4 Membro com mais de uma nomeação administrativa
      await st.test("9.4. Membro com mais de uma nomeação administrativa simultânea", async () => {
        // Atribui Escrivão e Tesoureiro ao Irmão A
        await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Escrivão', '${broAMid}'::uuid);
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Tesoureiro', '${broAMid}'::uuid);
        `);
        const memARes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broAUid}';
        `);
        assert.equal(
          memARes.rows[0].role_code,
          "escrivao",
          "Papel atribuído deve ser o de maior hierarquia entre os cargos ativos (escrivao > tesoureiro)"
        );
      });

      // 9.5 Preservação de privilégios quando ainda existe outra nomeação legítima
      await st.test("9.5. Preservação de privilégios quando ainda existe outra nomeação legítima ativa", async () => {
        // Desocupa o cargo de Escrivão do Irmão A (p_member_id IS NULL)
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Escrivão', null) as r;
        `);
        const r = res.rows[0].r;
        assert.equal(r.success, true);
        assert.equal(r.synchronized_with_rbac, true, "Sincronização com RBAC deve ser confirmada");

        const memARes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broAUid}';
        `);
        assert.equal(
          memARes.rows[0].role_code,
          "tesoureiro",
          "Irmão A deve reter privilégio de tesoureiro porque ainda ocupa legalmente esse cargo"
        );
      });

      // 9.6 Revogação efetiva do acesso administrativo quando não restar nenhuma nomeação
      await st.test("9.6. Revogação efetiva do acesso administrativo quando não restar nenhuma nomeação ativa", async () => {
        // Desocupa o cargo de Tesoureiro do Irmão A (p_member_id IS NULL)
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Tesoureiro', null) as r;
        `);
        const r = res.rows[0].r;
        assert.equal(r.success, true);
        assert.equal(r.synchronized_with_rbac, true);

        const memARes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broAUid}';
        `);
        assert.equal(
          memARes.rows[0].role_code,
          "membro",
          "Irmão A deve ter seu acesso administrativo integralmente revogado, voltando a membro"
        );
      });

      // 9.7 Desocupação de cargo sem sucessor (PCC) e retorno fiel de synchronized_with_rbac
      await st.test("9.7. Desocupação de cargo do PCC sem sucessor revoga Master do titular anterior", async () => {
        // Desocupa o cargo de PCC do Irmão B (p_member_id IS NULL)
        const res = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Presidente do Conselho Consultivo', null) as r;
        `);
        const r = res.rows[0].r;
        assert.equal(r.success, true);
        assert.equal(r.synchronized_with_rbac, true);

        const memBRes = await client.query(`
          select role_code from chapter_memberships where chapter_id = '${CN500}' and user_id = '${broBUid}';
        `);
        assert.equal(memBRes.rows[0].role_code, "membro", "Irmão B deve ter seu acesso Master revogado para membro");

        // Chamada subsequente em cargo já desocupado retorna synchronized_with_rbac = false
        const resVacant = await client.query(`
          select public.set_nominata_officer('${activeMgmtId}'::uuid, 'Presidente do Conselho Consultivo', null) as r;
        `);
        assert.equal(
          resVacant.rows[0].r.synchronized_with_rbac,
          false,
          "Cargo já vago não realiza mutação de RBAC e deve retornar false"
        );
      });

      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});
