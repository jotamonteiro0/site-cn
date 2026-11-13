import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

const CHAPTER_500_ID = "00000000-0000-0000-0000-000000000500";
const CONNECTION_STRING =
  "postgresql://postgres.qvvmpskixyjbislcatso:V9%23qL%4072%21mX%244zP%5E8wR%266kT%2A3nF%215jB@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

describe("Auditoria de Segurança e Conformidade do Módulo 5 — Nominata & Gestões", () => {
  let client;
  let memberIds = {
    master: null,
    common: null,
    pcc: null,
    external: null,
  };
  let userIds = {
    master: null,
    common: null,
    pcc: null,
  };
  let activeManagementId = null;
  let plannedManagementId = null;

  before(async () => {
    client = new pg.Client({
      connectionString: CONNECTION_STRING,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // 1. Identifica usuários reais para testes
    const memberships = await client.query(`
      select cm.user_id, cm.member_id, cm.role_code, m.id_demolay
      from public.chapter_memberships cm
      join public.members m on m.id = cm.member_id
      where cm.chapter_id = $1 and cm.is_active = true;
    `, [CHAPTER_500_ID]);

    for (const row of memberships.rows) {
      if (row.role_code === "master" && !memberIds.master) {
        memberIds.master = row.member_id;
        userIds.master = row.user_id;
      } else if (row.role_code === "membro" && !memberIds.common) {
        memberIds.common = row.member_id;
        userIds.common = row.user_id;
      }
    }

    // Limpa eventuais resíduos de testes anteriores
    await client.query(`
      delete from public.management_positions where management_id in (
        select id from public.managements where code like 'TEST%'
      );
      delete from public.managements where code like 'TEST%';
    `);
    const mgmts = await client.query(`
      select id, code, status from public.managements
      where chapter_id = $1 order by starts_on desc;
    `, [CHAPTER_500_ID]);

    for (const m of mgmts.rows) {
      if (m.status === "ativa" && !activeManagementId) {
        activeManagementId = m.id;
      } else if (m.status === "planejada" && !plannedManagementId) {
        plannedManagementId = m.id;
      }
    }
  });

  after(async () => {
    // Restaura a Gestão XXV (2026.2) como ativa caso algum teste tenha alternado
    if (activeManagementId) {
      await client.query(`
        update public.managements
        set status = 'ativa', updated_at = now()
        where id = $1;
      `, [activeManagementId]);
      await client.query(`
        update public.managements
        set status = 'planejada', updated_at = now()
        where id <> $1 and chapter_id = $2 and code = '2027.1';
      `, [activeManagementId, CHAPTER_500_ID]);
    }
    await client.end();
  });

  test("1. Isolamento Multi-Tenant: Todas as gestões pertencem exclusivamente ao Capítulo 500", async () => {
    const res = await client.query(`
      select count(*) as total, count(*) filter (where chapter_id = $1) as cn500
      from public.managements;
    `, [CHAPTER_500_ID]);

    assert.equal(
      Number(res.rows[0].total),
      Number(res.rows[0].cn500),
      "Todas as gestões cadastradas devem ser restritas ao Capítulo 500"
    );
  });

  test("2. Unicidade de Gestão Ativa: Exatamente uma gestão está ativa no Capítulo 500", async () => {
    const res = await client.query(`
      select count(*) as active_count
      from public.managements
      where chapter_id = $1 and status = 'ativa';
    `, [CHAPTER_500_ID]);

    assert.equal(
      Number(res.rows[0].active_count),
      1,
      "Deve existir exatamente uma gestão em status 'ativa' no Capítulo 500"
    );
  });

  test("3. Posições Canônicas: A Gestão Ativa possui cargos canônicos cadastrados", async () => {
    const res = await client.query(`
      select count(*) as pos_count
      from public.management_positions
      where management_id = $1;
    `, [activeManagementId]);

    assert.ok(
      Number(res.rows[0].pos_count) >= 15,
      "A gestão ativa deve possuir no mínimo os cargos principais da nominata"
    );

    const positions = await client.query(`
      select name from public.management_positions
      where management_id = $1;
    `, [activeManagementId]);

    const names = positions.rows.map((p) => p.name);
    assert.ok(names.includes("Mestre Conselheiro"), "Deve incluir Mestre Conselheiro");
    assert.ok(names.includes("Presidente do Conselho Consultivo"), "Deve incluir PCC");
    assert.ok(names.includes("Escrivão"), "Deve incluir Escrivão");
    assert.ok(names.includes("Tesoureiro"), "Deve incluir Tesoureiro");
  });

  test("4. RPC create_management_with_positions: Bloqueia chamada de anônimo e membro comum", async () => {
    // A) Simulação com anônimo (auth.uid() IS NULL)
    await assert.rejects(
      async () => {
        await client.query(`
          set local role anon;
          select public.create_management_with_positions(
            '${CHAPTER_500_ID}',
            '2028.1',
            'Gestão Teste Anon',
            '2028-01-01',
            '2028-06-30',
            null
          );
        `);
      },
      /permission denied/i,
      "Anônimo não possui permissão de EXECUTE em create_management_with_positions"
    );

    // B) Simulação com membro comum autenticado
    if (userIds.common) {
      await assert.rejects(
        async () => {
          await client.query(`
            set local role authenticated;
            set local "request.jwt.claim.sub" = '${userIds.common}';
            select public.create_management_with_positions(
              '${CHAPTER_500_ID}',
              '2028.1',
              'Gestão Teste Comum',
              '2028-01-01',
              '2028-06-30',
              null
            );
          `);
        },
        /Permissão negada/i,
        "Membro comum deve ser bloqueado no servidor ao tentar criar gestão"
      );
    }
  });

  test("5. RPC create_management_with_positions: Master cria gestão planejada com 25 posições", async () => {
    if (!userIds.master) return;

    const testCode = "TEST_" + Date.now().toString().slice(-6);
    const queryRes = await client.query(`
      set local role authenticated;
      set local "request.jwt.claim.sub" = '${userIds.master}';
      select public.create_management_with_positions(
        '${CHAPTER_500_ID}',
        '${testCode}',
        'Gestão de Teste Automatizado',
        '2099-01-01',
        '2099-06-30',
        'Tema de Teste'
      ) as result;
    `);

    const finalRes = Array.isArray(queryRes) ? queryRes[queryRes.length - 1] : queryRes;
    const result = finalRes.rows[0].result;
    assert.equal(result.success, true);
    assert.equal(result.status, "planejada");
    assert.equal(result.positions_count, 25);

    const newMgmtId = result.management_id;

    // Confirma que foram criadas 25 posições no banco
    const posRes = await client.query(`
      select count(*) as count from public.management_positions
      where management_id = $1;
    `, [newMgmtId]);

    assert.equal(Number(posRes.rows[0].count), 25);

    // Limpa a gestão temporária de teste
    await client.query(`delete from public.management_positions where management_id = $1`, [newMgmtId]);
    await client.query(`delete from public.managements where id = $1`, [newMgmtId]);
  });

  test("6. RPC activate_management: Bloqueia anônimos e membros comuns", async () => {
    // A) Anônimo
    await assert.rejects(
      async () => {
        await client.query(`
          set local role anon;
          select public.activate_management('${plannedManagementId || activeManagementId}');
        `);
      },
      /permission denied/i,
      "Anônimo não possui permissão de EXECUTE em activate_management"
    );

    // B) Membro comum autenticado
    if (userIds.common) {
      await assert.rejects(
        async () => {
          await client.query(`
            set local role authenticated;
            set local "request.jwt.claim.sub" = '${userIds.common}';
            select public.activate_management('${plannedManagementId || activeManagementId}');
          `);
        },
        /Permissão negada/i,
        "Membro comum deve ser bloqueado ao tentar ativar gestão"
      );
    }
  });

  test("7. Preservação de Mantenedores Permanentes (IDs 127738 e 102836)", async () => {
    const res = await client.query(`
      select m.id_demolay, m.full_name, cm.role_code
      from public.members m
      join public.chapter_memberships cm on cm.member_id = m.id
      where m.chapter_id = $1 and m.id_demolay in ('127738', '102836');
    `, [CHAPTER_500_ID]);

    for (const row of res.rows) {
      assert.equal(
        row.role_code,
        "master",
        `Membro ${row.full_name} (${row.id_demolay}) deve possuir papel 'master' permanente`
      );
    }
  });

  test("8. Ativação de Gestão: Execução real por Master preserva isolamento e recalcula RBAC", async () => {
    if (!userIds.master || !activeManagementId) return;

    // Executa activate_management na gestão ativa atual
    const res = await client.query(`
      set local role authenticated;
      set local "request.jwt.claim.sub" = '${userIds.master}';
      select public.activate_management('${activeManagementId}') as result;
    `);

    const finalRes = Array.isArray(res) ? res[res.length - 1] : res;
    const result = finalRes.rows[0].result;
    assert.equal(result.success, true);
    assert.equal(result.chapter_id, CHAPTER_500_ID);
    assert.ok(result.synchronized_memberships_count >= 1);

    // Confirma que mantenedor permanente continua Master
    const checkMaster = await client.query(`
      select role_code from public.chapter_memberships
      where chapter_id = $1 and user_id = $2;
    `, [CHAPTER_500_ID, userIds.master]);
    assert.equal(checkMaster.rows[0].role_code, "master");
  });

  test("9. Atribuição de Oficiais: set_nominata_officer valida capítulo e rejeita membros externos", async () => {
    if (!userIds.master || !activeManagementId) return;

    // Tenta atribuir membro com UUID aleatório que não pertence ao capítulo
    const fakeMemberId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    await assert.rejects(
      async () => {
        await client.query(`
          set local role authenticated;
          set local "request.jwt.claim.sub" = '${userIds.master}';
          select public.set_nominata_officer(
            '${activeManagementId}',
            'Escrivão',
            '${fakeMemberId}'
          );
        `);
      },
      /Membro inválido, inativo ou não pertencente a este capítulo/i,
      "Deve rejeitar membro inexistente ou externo ao capítulo"
    );
  });

  test("10. Integridade do Histórico de Gestões: Gestões encerradas permanecem gravadas e acessíveis", async () => {
    const res = await client.query(`
      select count(*) as past_count
      from public.managements
      where chapter_id = $1 and status = 'encerrada';
    `, [CHAPTER_500_ID]);

    assert.ok(
      Number(res.rows[0].past_count) >= 10,
      "O histórico capitular do Capítulo 500 deve manter registradas as gestões históricas encerradas"
    );
  });

  test("11. Integridade Estrutural: Índice único parcial impede fisicamente duas gestões ativas no mesmo capítulo", async () => {
    // Tentativa de inserir uma segunda gestão com status 'ativa' no Capítulo 500
    await client.query("BEGIN;");
    try {
      await assert.rejects(
        async () => {
          await client.query(`
            insert into public.managements (chapter_id, code, title, starts_on, ends_on, status)
            values ('${CHAPTER_500_ID}', 'TEST_DUP_ACTIVE', 'Gestão Duplicada Teste', '2090-01-01', '2090-06-30', 'ativa');
          `);
        },
        (err) => {
          assert.equal(err.code, "23505", "Código de erro deve ser unique_violation (23505)");
          assert.match(
            err.message,
            /uq_one_active_management_per_chapter/i,
            "Deve violar o índice parcial uq_one_active_management_per_chapter"
          );
          return true;
        },
        "Deve rejeitar inserção de segunda gestão ativa no mesmo capítulo via índice parcial"
      );
    } finally {
      await client.query("ROLLBACK;");
    }
  });

  test("12. Concorrência e Serialização: Bloqueio pessimista (FOR UPDATE) serializa ativações no mesmo capítulo", async () => {
    const client2 = new pg.Client({
      connectionString: CONNECTION_STRING,
      ssl: { rejectUnauthorized: false },
    });
    await client2.connect();

    try {
      // Cliente 1 inicia transação e adquire o bloqueio exclusivo da linha do Capítulo 500
      await client.query("BEGIN;");
      await client.query(
        `select 1 from public.chapters where id = $1 for update;`,
        [CHAPTER_500_ID]
      );

      // Cliente 2 tenta adquirir o mesmo bloqueio com timeout curto de 500ms
      await client2.query("set statement_timeout = 500;");
      let timedOut = false;
      try {
        await client2.query(
          `select 1 from public.chapters where id = $1 for update;`,
          [CHAPTER_500_ID]
        );
      } catch (err) {
        timedOut = true;
        assert.equal(err.code, "57014", "Erro deve ser query_canceled / statement_timeout (57014)");
      }
      assert.ok(
        timedOut,
        "Cliente 2 deve ser bloqueado na aquisição do lock concorrente do mesmo capítulo"
      );

      // Cliente 1 libera o lock via ROLLBACK
      await client.query("ROLLBACK;");

      // Agora Cliente 2 consegue adquirir o lock imediatamente sem timeout
      await client2.query("set statement_timeout = 5000;");
      await client2.query("BEGIN;");
      const c2Res = await client2.query(
        `select 1 from public.chapters where id = $1 for update;`,
        [CHAPTER_500_ID]
      );
      assert.equal(c2Res.rowCount, 1, "Cliente 2 adquire o lock após liberação pelo Cliente 1");
      await client2.query("ROLLBACK;");
    } finally {
      await client2.end();
    }
  });

  test("13. Independência entre Capítulos Distintos: Bloqueio em um capítulo não bloqueia outro", async () => {
    const client2 = new pg.Client({
      connectionString: CONNECTION_STRING,
      ssl: { rejectUnauthorized: false },
    });
    await client2.connect();

    const otherChapterId = "00000000-0000-0000-0000-000000000888";

    try {
      // Garante criação limpa de um capítulo temporário isolado
      await client.query(`
        insert into public.chapters (id, number, name, slug)
        values ('${otherChapterId}', '888', 'Capítulo Paralelo Teste', 'capitulo-888')
        on conflict (id) do nothing;
      `);

      // Cliente 1 bloqueia Capítulo 500
      await client.query("BEGIN;");
      await client.query(
        `select 1 from public.chapters where id = $1 for update;`,
        [CHAPTER_500_ID]
      );

      // Cliente 2 bloqueia Capítulo 888 com timeout de 600ms
      await client2.query("BEGIN;");
      await client2.query("set statement_timeout = 600;");
      const c2Res = await client2.query(
        `select 1 from public.chapters where id = $1 for update;`,
        [otherChapterId]
      );
      assert.equal(
        c2Res.rowCount,
        1,
        "Cliente 2 deve adquirir lock do Capítulo 888 imediatamente sem bloqueio pelo Capítulo 500"
      );

      await client.query("ROLLBACK;");
      await client2.query("ROLLBACK;");
    } finally {
      // Limpeza estrita do capítulo temporário de teste
      await client.query(`delete from public.chapters where id = $1;`, [otherChapterId]);
      await client2.end();
    }
  });

  test("14. Atomicidade e Rollback Integral: Falha durante ativação reverte todas as modificações", async () => {
    if (!userIds.master) return;

    // Snapshot do estado pré-teste
    const preMgmt = await client.query(
      `select id, status from public.managements where chapter_id = $1 and status = 'ativa';`,
      [CHAPTER_500_ID]
    );
    const preActiveId = preMgmt.rows[0].id;

    // Em uma transação, tenta ativar um ID de gestão inexistente
    await client.query("BEGIN;");
    try {
      await assert.rejects(
        async () => {
          await client.query(`
            set local role authenticated;
            set local "request.jwt.claim.sub" = '${userIds.master}';
            select public.activate_management('ffffffff-ffff-ffff-ffff-ffffffffffff');
          `);
        },
        /Gestão não encontrada/i,
        "Deve falhar com exceção se a gestão não for encontrada"
      );
    } finally {
      await client.query("ROLLBACK;");
    }

    // Verifica que o estado original permanece 100% inalterado
    const postMgmt = await client.query(
      `select id, status from public.managements where chapter_id = $1 and status = 'ativa';`,
      [CHAPTER_500_ID]
    );
    assert.equal(postMgmt.rows.length, 1);
    assert.equal(postMgmt.rows[0].id, preActiveId);
  });

  test("15. Preservação Intacta da Gestão XXV e do RBAC de Produção", async () => {
    const res = await client.query(`
      select id, code, title, status
      from public.managements
      where chapter_id = $1 and status = 'ativa';
    `, [CHAPTER_500_ID]);

    assert.equal(res.rows.length, 1, "Exatamente uma gestão ativa no Capítulo 500");
    assert.equal(res.rows[0].code, "2026.2", "A gestão ativa deve ser a Gestão XXV (2026.2)");

    // Confirma que os mantenedores permanentes 127738 e 102836 permanecem Master
    const permRes = await client.query(`
      select m.id_demolay, cm.role_code
      from public.members m
      join public.chapter_memberships cm on cm.member_id = m.id
      where m.chapter_id = $1 and m.id_demolay in ('127738', '102836');
    `, [CHAPTER_500_ID]);

    for (const r of permRes.rows) {
      assert.equal(r.role_code, "master", `Membro ${r.id_demolay} deve permanecer Master`);
    }
  });
});
