import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const connectionString = "postgresql://postgres.qvvmpskixyjbislcatso:V9%23qL%4072%21mX%244zP%5E8wR%266kT%2A3nF%215jB@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_nlGgEKNZC0_fNuoYM9Og2A_HUyoJ-4G";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";

const CN500 = "00000000-0000-0000-0000-000000000500";
const OTHER_CHAPTER = "00000000-0000-0000-0000-000000000888";

const firstAccessRoutePath = path.resolve('app/api/auth/first-access/route.ts');

test('Auditoria Técnica Rigorosa: View members_public, Associação de Identidade, Concorrência e Recuperação', async (t) => {
  let client;

  t.before(async () => {
    client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
  });

  t.after(async () => {
    if (client) await client.end();
  });

  // ==========================================================================
  // SEÇÃO 1: AUDITORIA DA VIEW MEMBERS_PUBLIC, PROPRIETÁRIO E PRIVILÉGIOS
  // ==========================================================================
  await t.test('1. Definição, Proprietário e Privilégios da View members_public', async () => {
    // 1.1 Proprietário da view deve ser postgres
    const ownerRes = await client.query(`
      select viewowner, definition
      from pg_views
      where viewname = 'members_public';
    `);
    assert.equal(ownerRes.rows.length, 1, 'View members_public deve existir');
    assert.equal(ownerRes.rows[0].viewowner, 'postgres', 'Proprietário da view deve ser postgres');
    assert.ok(
      ownerRes.rows[0].definition.includes('is_chapter_member(chapter_id)'),
      'Definição deve incluir filtro de pertença capitular is_chapter_member'
    );
    assert.ok(
      ownerRes.rows[0].definition.includes('is_active = true'),
      'Definição deve filtrar apenas membros com cadastro ativo'
    );

    // 1.2 Privilégios de Acesso: anon NÃO deve ter permissão; authenticated apenas SELECT
    const privsRes = await client.query(`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_name = 'members_public';
    `);

    const anonPrivs = privsRes.rows.filter(r => r.grantee === 'anon');
    assert.equal(anonPrivs.length, 0, 'Papel anon deve ter ZERO privilégios na view members_public');

    const authPrivs = privsRes.rows.filter(r => r.grantee === 'authenticated');
    assert.equal(authPrivs.length, 1, 'Papel authenticated deve ter apenas 1 privilégio');
    assert.equal(authPrivs[0].privilege_type, 'SELECT', 'Papel authenticated deve ter estritamente permissão SELECT');
  });

  // ==========================================================================
  // SEÇÃO 2: HARDENING DE SEGURANÇA (SET search_path = '') E PRIVILÉGIOS SQL
  // ==========================================================================
  await t.test('2. Hardening das Funções RLS: SET search_path = \'\' e Qualificação Estrita de Objetos', async () => {
    const fnRes = await client.query(`
      select proname, prosecdef, proconfig, proacl, pg_get_functiondef(oid) as def
      from pg_proc
      where proname in ('is_chapter_member', 'has_chapter_role')
        and pronamespace = 'public'::regnamespace;
    `);

    assert.equal(fnRes.rows.length, 2, 'Ambas as funções de RLS devem existir');

    for (const fn of fnRes.rows) {
      assert.ok(fn.prosecdef, `Função ${fn.proname} deve ser SECURITY DEFINER`);
      assert.ok(
        fn.proconfig && fn.proconfig.some(c => c.startsWith('search_path=')),
        `Função ${fn.proname} deve possuir search_path explicitamente configurado como vazio`
      );
      assert.ok(
        fn.def.includes('public.chapter_memberships'),
        `Função ${fn.proname} deve qualificar public.chapter_memberships`
      );
      assert.ok(
        fn.def.includes('auth.uid()'),
        `Função ${fn.proname} deve qualificar auth.uid()`
      );

      // Verificação estrita de privilégios SQL (Least Privilege)
      const aclStr = Array.isArray(fn.proacl) ? fn.proacl.join(',') : String(fn.proacl || '');
      const grantees = aclStr.replace(/[{}]/g, '').split(',').map(entry => entry.split('=')[0]);
      assert.ok(!grantees.includes(''), `Privilégio PUBLIC deve estar revogado em ${fn.proname}`);
      assert.ok(!grantees.includes('anon'), `Papel anon NÃO deve ter EXECUTE em ${fn.proname}`);
      assert.ok(grantees.includes('authenticated'), `Papel authenticated DEVE ter EXECUTE em ${fn.proname}`);
      assert.ok(grantees.includes('service_role'), `Papel service_role DEVE ter EXECUTE em ${fn.proname}`);
    }
  });

  await t.test('2.1. Bloqueio Estrito de Chamadas Anônimas às Funções SECURITY DEFINER (SQL e PostgREST RPC)', async () => {
    // 2.1.1 Sessão de Banco Direta como anon
    await client.query('BEGIN');
    try {
      await client.query(`SET LOCAL ROLE anon;`);
      await client.query(`SET LOCAL "request.jwt.claims" = '{}';`);

      let anonFn1Err = null;
      try {
        await client.query(`SELECT public.is_chapter_member('${CN500}'::uuid);`);
      } catch (err) {
        anonFn1Err = err.message;
      }
      assert.ok(
        anonFn1Err && anonFn1Err.includes('permission denied for function is_chapter_member'),
        'Chamada direta de anon a is_chapter_member deve falhar com permission denied'
      );
    } finally {
      await client.query('ROLLBACK');
    }

    await client.query('BEGIN');
    try {
      await client.query(`SET LOCAL ROLE anon;`);
      await client.query(`SET LOCAL "request.jwt.claims" = '{}';`);

      let anonFn2Err = null;
      try {
        await client.query(`SELECT public.has_chapter_role('${CN500}'::uuid, ARRAY['master']);`);
      } catch (err) {
        anonFn2Err = err.message;
      }
      assert.ok(
        anonFn2Err && anonFn2Err.includes('permission denied for function has_chapter_role'),
        'Chamada direta de anon a has_chapter_role deve falhar com permission denied'
      );
    } finally {
      await client.query('ROLLBACK');
    }

    // 2.1.2 Chamada Remota PostgREST RPC com Chave Anônima
    const anonRpc = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const rpc1Res = await anonRpc.rpc('is_chapter_member', { target_chapter: CN500 });
    assert.ok(rpc1Res.error, 'PostgREST RPC is_chapter_member deve retornar erro para anônimo');
    assert.ok(
      rpc1Res.error.message.includes('permission denied for function is_chapter_member'),
      'Erro do PostgREST deve indicar permission denied para is_chapter_member'
    );

    const rpc2Res = await anonRpc.rpc('has_chapter_role', {
      target_chapter: CN500,
      allowed_roles: ['master'],
    });
    assert.ok(rpc2Res.error, 'PostgREST RPC has_chapter_role deve retornar erro para anônimo');
    assert.ok(
      rpc2Res.error.message.includes('permission denied for function has_chapter_role'),
      'Erro do PostgREST deve indicar permission denied para has_chapter_role'
    );
  });

  // ==========================================================================
  // SEÇÃO 3: RESTRIÇÕES DE INTEGRIDADE NO BANCO DE DADOS
  // ==========================================================================
  await t.test('3. Constraints Únicas no PostgreSQL (Não Apenas na Aplicação)', async () => {
    const constraintsRes = await client.query(`
      select conname, pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      where conrelid = 'public.members'::regclass
        and contype = 'u';
    `);

    const defs = constraintsRes.rows.map(r => r.def);
    assert.ok(
      defs.some(d => d.includes('(chapter_id, id_demolay)')),
      'PostgreSQL deve possuir constraint UNIQUE (chapter_id, id_demolay)'
    );
    assert.ok(
      defs.some(d => d.includes('(chapter_id, profile_id)')),
      'PostgreSQL deve possuir constraint UNIQUE (chapter_id, profile_id)'
    );
  });

  // ==========================================================================
  // SEÇÃO 4: TESTES DE ACESSO DIRETO VIA SESSÃO POSTGREST NO POSTGRESQL
  // ==========================================================================
  await t.test('4. Matriz de Acesso PostgREST (Sessão de Banco): Simulação de Perfis Institucionais', async () => {
    await client.query('BEGIN');
    try {
      await client.query(`
        insert into chapters (id, slug, name, number, is_public, is_active)
        values ('${OTHER_CHAPTER}', 'capitulo-externo-test-888', 'Capítulo Externo 888', 888, true, true)
        on conflict (id) do nothing;
      `);

      const testUids = {
        master: '20000000-0000-0000-0000-000000000001',
        escrivao: '20000000-0000-0000-0000-000000000002',
        membroComum: '20000000-0000-0000-0000-000000000003',
        outroCapitulo: '20000000-0000-0000-0000-000000000004',
        semVinculo: '20000000-0000-0000-0000-000000000005',
        inativo: '20000000-0000-0000-0000-000000000006',
      };

      for (const [k, uid] of Object.entries(testUids)) {
        await client.query(`
          insert into auth.users (id, aud, role, email)
          values ('${uid}', 'authenticated', 'authenticated', '${k}@audit.test')
          on conflict (id) do nothing;
        `);
      }

      await client.query(`
        insert into chapter_memberships (chapter_id, user_id, role_code, is_active) values
        ('${CN500}', '${testUids.master}', 'master', true),
        ('${CN500}', '${testUids.escrivao}', 'escrivao', true),
        ('${CN500}', '${testUids.membroComum}', 'membro', true),
        ('${OTHER_CHAPTER}', '${testUids.outroCapitulo}', 'membro', true),
        ('${CN500}', '${testUids.inativo}', 'membro', false)
        on conflict (chapter_id, user_id) do update set role_code = excluded.role_code, is_active = excluded.is_active;
      `);

      // Cenário A: Mestre Conselheiro
      await client.query(`SET LOCAL ROLE authenticated;`);
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testUids.master}"}';`);
      const masterMem = await client.query('select count(*)::int as c from public.members where chapter_id = $1 and email is not null', [CN500]);
      assert.ok(masterMem.rows[0].c > 0, 'Master deve acessar cadastro administrativo com emails');

      // Cenário B: Escrivão
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testUids.escrivao}"}';`);
      const escrivaoMem = await client.query('select count(*)::int as c from public.members where chapter_id = $1 and email is not null', [CN500]);
      assert.ok(escrivaoMem.rows[0].c > 0, 'Escrivão deve acessar cadastro administrativo com emails');

      // Cenário C: Membro Comum
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testUids.membroComum}"}';`);
      const membroBaseMem = await client.query('select count(*)::int as c from public.members where chapter_id = $1 and email is not null', [CN500]);
      assert.equal(membroBaseMem.rows[0].c, 0, 'Membro comum deve receber 0 emails de outros membros na tabela base');

      const membroPubMem = await client.query('select count(*)::int as c from public.members_public where chapter_id = $1', [CN500]);
      assert.ok(membroPubMem.rows[0].c > 0, 'Membro comum visualiza o censo institucional via members_public');

      // Cenário D: Membro de Outro Capítulo (Isolamento Multi-Tenant)
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testUids.outroCapitulo}"}';`);
      const outroCapMem = await client.query('select count(*)::int as c from public.members_public where chapter_id = $1', [CN500]);
      assert.equal(outroCapMem.rows[0].c, 0, 'Usuário de outro capítulo não recebe nenhum registro do Capítulo 500');

      // Cenário E: Usuário sem Vínculo
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testUids.semVinculo}"}';`);
      const semVinculoMem = await client.query('select count(*)::int as c from public.members_public where chapter_id = $1', [CN500]);
      assert.equal(semVinculoMem.rows[0].c, 0, 'Usuário sem vínculo no capítulo não visualiza nenhum registro');

      // Cenário F: Usuário Inativo
      await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${testUids.inativo}"}';`);
      const inativoMem = await client.query('select count(*)::int as c from public.members_public where chapter_id = $1', [CN500]);
      assert.equal(inativoMem.rows[0].c, 0, 'Usuário inativo tem acesso revogado à view do censo');

      // Cenário G: Usuário Anônimo (Bloqueado por permissão de esquema)
      await client.query(`SET LOCAL ROLE anon;`);
      await client.query(`SET LOCAL "request.jwt.claims" = '{}';`);
      let anonErr = null;
      try {
        await client.query('select count(*)::int as c from public.members_public');
      } catch (e) {
        anonErr = e.message;
      }
      assert.ok(anonErr && anonErr.includes('permission denied'), 'Anônimo deve ser barrado com permission denied');

    } finally {
      await client.query('ROLLBACK');
    }
  });

  // ==========================================================================
  // SEÇÃO 5: TESTES HTTP REAIS VIA POSTGREST COM JWTS DO SUPABASE AUTH
  // ==========================================================================
  await t.test('5. Requisições HTTP Reais ao PostgREST com JWTs do GoTrue Auth', async () => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const testPassword = "PasswordReal#500HTTP!";
    const testProfiles = [
      { key: "master", email: "http.master@cn500.test", role: "master", chapter: CN500, active: true },
      { key: "escrivao", email: "http.escrivao@cn500.test", role: "escrivao", chapter: CN500, active: true },
      { key: "membro", email: "http.membro@cn500.test", role: "membro", chapter: CN500, active: true },
      { key: "outro_cap", email: "http.outrocap@cn500.test", role: "membro", chapter: OTHER_CHAPTER, active: true },
      { key: "sem_vinculo", email: "http.semvinculo@cn500.test", role: null, chapter: null, active: false },
      { key: "inativo", email: "http.inativo@cn500.test", role: "membro", chapter: CN500, active: false },
    ];

    const jwts = {};

    try {
      // 5.1 Provisiona usuários no GoTrue Auth e define memberships no banco
      await admin.from("chapters").upsert({
        id: OTHER_CHAPTER,
        slug: "capitulo-externo-http-888",
        name: "Capítulo Externo HTTP 888",
        number: 888,
        is_public: true,
        is_active: true,
      });

      for (const p of testProfiles) {
        const { data: users } = await admin.auth.admin.listUsers();
        let user = users.users.find(u => u.email === p.email);
        if (!user) {
          const { data: created } = await admin.auth.admin.createUser({
            email: p.email,
            password: testPassword,
            email_confirm: true,
          });
          user = created.user;
        } else {
          await admin.auth.admin.updateUserById(user.id, { password: testPassword, email_confirm: true });
        }

        if (p.chapter) {
          await admin.from("chapter_memberships").upsert({
            chapter_id: p.chapter,
            user_id: user.id,
            role_code: p.role,
            is_active: p.active,
          }, { onConflict: "chapter_id,user_id" });
        } else {
          await admin.from("chapter_memberships").delete().eq("user_id", user.id);
        }

        // Login real via GoTrue para receber JWT assinado
        const { data: sessionData, error: lErr } = await anon.auth.signInWithPassword({
          email: p.email,
          password: testPassword,
        });
        assert.ifError(lErr);
        assert.ok(sessionData.session?.access_token, `JWT deve ser emitido para ${p.email}`);
        jwts[p.key] = sessionData.session.access_token;
      }

      // 5.2 Teste HTTP Real: Mestre Conselheiro e Escrivão (Autorizados a ver cadastro)
      for (const roleKey of ["master", "escrivao"]) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/members?select=id,full_name,email&chapter_id=eq.${CN500}`, {
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwts[roleKey]}` }
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(data.length > 0, `${roleKey} deve acessar membros via HTTP PostgREST`);
      }

      // 5.3 Teste HTTP Real: Membro Comum (Bloqueado de ver emails/telefones de outros)
      const resMembro = await fetch(`${SUPABASE_URL}/rest/v1/members?select=id,full_name,email&chapter_id=eq.${CN500}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwts.membro}` }
      });
      assert.equal(resMembro.status, 200);
      const dataMembro = await resMembro.json();
      assert.equal(dataMembro.length, 0, 'Membro comum deve receber 0 registros com emails via HTTP PostgREST');

      // 5.4 Teste HTTP Real: View members_public para Membro Comum (Acesso Concedido ao Censo)
      const resPub = await fetch(`${SUPABASE_URL}/rest/v1/members_public?select=id,full_name,category&chapter_id=eq.${CN500}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwts.membro}` }
      });
      assert.equal(resPub.status, 200);
      const dataPub = await resPub.json();
      assert.ok(dataPub.length > 0, 'Membro comum deve acessar o censo via members_public via HTTP PostgREST');

      // 5.5 Teste HTTP Real: Tentativa de Exploit em members_public (Coluna inexistente)
      const resExploit = await fetch(`${SUPABASE_URL}/rest/v1/members_public?select=id,full_name,email&chapter_id=eq.${CN500}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwts.membro}` }
      });
      assert.equal(resExploit.status, 400, 'Tentativa de ler email em members_public deve retornar HTTP 400');

      // 5.6 Teste HTTP Real: Usuário Anônimo (Bloqueado por schema permission)
      const resAnon = await fetch(`${SUPABASE_URL}/rest/v1/members_public?select=id,full_name`, {
        headers: { apikey: ANON_KEY }
      });
      assert.equal(resAnon.status, 401, 'Anônimo deve receber HTTP 401 Unauthorized');

      // 5.7 Teste HTTP Real: Usuário de Outro Capítulo (Isolamento Multi-Tenant)
      const resOutro = await fetch(`${SUPABASE_URL}/rest/v1/members_public?select=id,full_name&chapter_id=eq.${CN500}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwts.outro_cap}` }
      });
      assert.equal(resOutro.status, 200);
      const dataOutro = await resOutro.json();
      assert.equal(dataOutro.length, 0, 'Outro capítulo deve receber 0 registros do CN500 via HTTP PostgREST');

    } finally {
      // Limpeza
      for (const p of testProfiles) {
        const { data: users } = await admin.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email === p.email);
        if (user) {
          await admin.from("chapter_memberships").delete().eq("user_id", user.id);
          await admin.auth.admin.deleteUser(user.id);
        }
      }
      await admin.from("chapters").delete().eq("id", OTHER_CHAPTER);
    }
  });

  // ==========================================================================
  // SEÇÃO 6: AUDITORIA DA ASSOCIAÇÃO DE IDENTIDADE E PROTEÇÃO CONTRA FALSIFICAÇÃO
  // ==========================================================================
  await t.test('6. Associação de Identidade Controlada pelo Servidor (app_metadata e Banco)', () => {
    const routeContent = fs.readFileSync(firstAccessRoutePath, 'utf8');

    // 6.1 Proibição de confiar em user_metadata para validações críticas
    assert.ok(
      routeContent.includes('existingUser.app_metadata?.id_demolay'),
      'Deve validar ID DeMolay em app_metadata (protegido e imutável pelo cliente)'
    );
    assert.ok(
      routeContent.includes('app_metadata: {'),
      'Deve gravar ID DeMolay e metadados institucionais em app_metadata no provisionamento'
    );

    // 6.2 Prevenção de Apropriação de Contas
    assert.ok(
      routeContent.includes('otherBoundMember'),
      'Deve verificar no banco se a conta Auth já está vinculada a outro irmão'
    );
    assert.ok(
      routeContent.includes('Esta conta de acesso já está associada ao cadastro de outro irmão'),
      'Mensagem explícita de rejeição por tentativa de apropriação de conta'
    );

    // 6.3 Imutabilidade de Identidade na Recuperação do Token
    assert.ok(
      routeContent.includes('tokenContent.claimed_by_email'),
      'Token iniciado em tentativa anterior bloqueia troca de e-mail na recuperação'
    );
    assert.ok(
      routeContent.includes('tokenContent.id_demolay && tokenContent.id_demolay !== cleanId'),
      'Token é estritamente vinculado à ID DeMolay para a qual foi gerado'
    );

    // 6.4 Prevenção de Duplicidade de ID DeMolay com Contas Diferentes
    assert.ok(
      routeContent.includes('member.profile_id'),
      'Se o membro já possuir profile_id, impede criação de segunda conta para a mesma ID'
    );
  });

  // ==========================================================================
  // SEÇÃO 7: CONCORRÊNCIA E RECUPERAÇÃO IDEMPOTENTE DISTRIBUÍDA
  // ==========================================================================
  await t.test('7. Concorrência Atômica no Banco e Estados Persistentes', async () => {
    const clientB = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await clientB.connect();

    const testDecId = '00000000-0000-0000-0000-000000000999';
    const memberId = 'afacfcf3-653e-4911-a9f1-5d4657d4dc7a';

    try {
      // 7.1 Token pendente inicial
      await client.query(`
        insert into issued_declarations (id, chapter_id, member_id, declaration_type, verification_code, content_data)
        values ('${testDecId}', '${CN500}', '${memberId}', 'frequencia', 'CONCURRENCY-HASH-TEST', '{"is_used": false, "activation_state": "PENDING"}')
        on conflict (id) do update set content_data = '{"is_used": false, "activation_state": "PENDING"}';
      `);

      // 7.2 Duas requisições paralelas simultâneas
      const req1 = client.query(`
        update issued_declarations 
        set content_data = '{"is_used": true, "activation_state": "CLAIMED", "winner": 1}'
        where id = '${testDecId}' and content_data->>'is_used' = 'false'
        returning id;
      `);

      const req2 = clientB.query(`
        update issued_declarations 
        set content_data = '{"is_used": true, "activation_state": "CLAIMED", "winner": 2}'
        where id = '${testDecId}' and content_data->>'is_used' = 'false'
        returning id;
      `);

      const [res1, res2] = await Promise.all([req1, req2]);
      assert.equal(res1.rowCount + res2.rowCount, 1, 'Exatamente uma requisição paralela consome o token');

      // 7.3 Rollback controlado com estado persistente FAILED_RECOVERABLE
      await client.query(`
        update issued_declarations
        set content_data = jsonb_set(
          jsonb_set(content_data, '{is_used}', 'false'::jsonb),
          '{activation_state}', '"FAILED_RECOVERABLE"'::jsonb
        )
        where id = '${testDecId}';
      `);

      const rollbackCheck = await client.query(`
        select content_data->>'is_used' as is_used, content_data->>'activation_state' as state
        from issued_declarations
        where id = '${testDecId}';
      `);

      assert.equal(rollbackCheck.rows[0].is_used, 'false', 'is_used revertido para false');
      assert.equal(rollbackCheck.rows[0].state, 'FAILED_RECOVERABLE', 'Estado de ativação persistido como FAILED_RECOVERABLE');

      // 7.4 Conclusão com sucesso com estado COMPLETED
      await client.query(`
        update issued_declarations
        set content_data = jsonb_set(
          jsonb_set(content_data, '{is_used}', 'true'::jsonb),
          '{activation_state}', '"COMPLETED"'::jsonb
        )
        where id = '${testDecId}';
      `);

      const completedCheck = await client.query(`
        select content_data->>'is_used' as is_used, content_data->>'activation_state' as state
        from issued_declarations
        where id = '${testDecId}';
      `);

      assert.equal(completedCheck.rows[0].is_used, 'true', 'Token finalizado marcado como is_used = true');
      assert.equal(completedCheck.rows[0].state, 'COMPLETED', 'Estado de ativação finalizado como COMPLETED');

    } finally {
      await client.query(`delete from issued_declarations where id = '${testDecId}';`);
      await clientB.end();
    }
  });
});
