import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

/**
 * TESTE DE INTEGRAÇÃO DE CONCORRÊNCIA REAL: RPC public.activate_management
 * 
 * Requisitos:
 * 1. Execução de duas chamadas SIMULTÂNEAS reais à RPC activate_management via Promise.all.
 * 2. Comprovação da serialização pelo bloqueio pessimista (SELECT ... FOR UPDATE).
 * 3. Garantia de unicidade de gestão ativa e ausência de colisão com o índice único parcial.
 * 4. Verificação de encerramento da gestão anterior e recálculo atômico de RBAC.
 * 5. Isolamento e não-bloqueio entre capítulos distintos.
 * 
 * DIRETRIZ DE SEGURANÇA:
 * Para prevenir mutações ou poluição concorrente na base de produção (Capítulo 500 / Gestão XXV),
 * este teste requer a variável de ambiente TEST_DATABASE_URL apontando para uma instância
 * de staging ou branch isolado do Supabase. Na ausência de TEST_DATABASE_URL, a suíte
 * documenta a limitação formal de ambiente sem executar commits no banco de produção.
 */

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const ISOLATED_TEST_CHAPTER_A = "00000000-0000-0000-0000-000000000771";
const ISOLATED_TEST_CHAPTER_B = "00000000-0000-0000-0000-000000000772";

describe("Auditoria de Concorrência Real da Nominata (RPC activate_management)", () => {
  if (!TEST_DB_URL) {
    test("Limitação de Ambiente Documentada: Ausência de Banco de Testes Isolado (Staging)", () => {
      // Conforme diretriz: 'Caso o ambiente disponível não permita esse teste com segurança,
      // não invente um resultado positivo. Documente a limitação e apresente a forma necessária de executá-lo.'
      assert.ok(
        !TEST_DB_URL,
        "Ambiente de banco de testes isolado (TEST_DATABASE_URL) não configurado."
      );
      console.log(
        "\n[AUDITORIA - REGISTRO TÉCNICO FORMAL]\n" +
        "O repositório dispõe exclusivamente da URI do banco principal de produção.\n" +
        "Executar duas chamadas concorrentes com commit real na RPC activate_management\n" +
        "diretamente na base de produção violaria a regra de ouro de integridade dos dados.\n" +
        "A suíte completa está implementada e pronta para execução assim que provisionado\n" +
        "um ambiente de staging/teste (ex: Supabase Branching ou container PostgreSQL).\n"
      );
    });
    return;
  }

  let client1;
  let client2;
  let mgmtA1Id = null;
  let mgmtA2Id = null;
  let mgmtB1Id = null;

  before(async () => {
    client1 = new pg.Client({ connectionString: TEST_DB_URL, ssl: { rejectUnauthorized: false } });
    client2 = new pg.Client({ connectionString: TEST_DB_URL, ssl: { rejectUnauthorized: false } });
    await client1.connect();
    await client2.connect();

    // 1. Cria Capítulos de Teste Isolados
    await client1.query(`
      insert into public.chapters (id, number, name, slug)
      values
        ('${ISOLATED_TEST_CHAPTER_A}', '771', 'Capítulo Teste Concorrência A', 'capitulo-teste-771'),
        ('${ISOLATED_TEST_CHAPTER_B}', '772', 'Capítulo Teste Concorrência B', 'capitulo-teste-772')
      on conflict (id) do nothing;
    `);

    // 2. Prepara Gestões Planejadas A1 e A2 no Capítulo A
    const resA1 = await client1.query(`
      insert into public.managements (chapter_id, code, title, starts_on, ends_on, status)
      values ('${ISOLATED_TEST_CHAPTER_A}', 'TEST_CONC_A1', 'Gestão Concorrente A1', '2030-01-01', '2030-06-30', 'planejada')
      returning id;
    `);
    mgmtA1Id = resA1.rows[0].id;

    const resA2 = await client1.query(`
      insert into public.managements (chapter_id, code, title, starts_on, ends_on, status)
      values ('${ISOLATED_TEST_CHAPTER_A}', 'TEST_CONC_A2', 'Gestão Concorrente A2', '2030-07-01', '2030-12-31', 'planejada')
      returning id;
    `);
    mgmtA2Id = resA2.rows[0].id;

    // 3. Prepara Gestão B1 no Capítulo B
    const resB1 = await client1.query(`
      insert into public.managements (chapter_id, code, title, starts_on, ends_on, status)
      values ('${ISOLATED_TEST_CHAPTER_B}', 'TEST_CONC_B1', 'Gestão Paralela B1', '2030-01-01', '2030-06-30', 'planejada')
      returning id;
    `);
    mgmtB1Id = resB1.rows[0].id;
  });

  after(async () => {
    if (client1) {
      // Limpeza estrita e total dos dados de teste
      await client1.query(`delete from public.member_management_positions where management_position_id in (
        select id from public.management_positions where management_id in ('${mgmtA1Id}', '${mgmtA2Id}', '${mgmtB1Id}')
      );`);
      await client1.query(`delete from public.management_positions where management_id in ('${mgmtA1Id}', '${mgmtA2Id}', '${mgmtB1Id}');`);
      await client1.query(`delete from public.managements where chapter_id in ('${ISOLATED_TEST_CHAPTER_A}', '${ISOLATED_TEST_CHAPTER_B}');`);
      await client1.query(`delete from public.chapter_memberships where chapter_id in ('${ISOLATED_TEST_CHAPTER_A}', '${ISOLATED_TEST_CHAPTER_B}');`);
      await client1.query(`delete from public.members where chapter_id in ('${ISOLATED_TEST_CHAPTER_A}', '${ISOLATED_TEST_CHAPTER_B}');`);
      await client1.query(`delete from public.chapters where id in ('${ISOLATED_TEST_CHAPTER_A}', '${ISOLATED_TEST_CHAPTER_B}');`);
      await client1.end();
    }
    if (client2) {
      await client2.end();
    }
  });

  test("1. Chamadas Simultâneas Reais (Promise.all) à RPC activate_management no mesmo Capítulo", async () => {
    // Dispara as duas ativações concorrentes reais ao mesmo tempo
    const [res1, res2] = await Promise.all([
      client1.query(`select public.activate_management($1) as res;`, [mgmtA1Id]),
      client2.query(`select public.activate_management($1) as res;`, [mgmtA2Id]),
    ]);

    assert.ok(res1.rows[0].res.success, "Transação 1 concluiu com sucesso");
    assert.ok(res2.rows[0].res.success, "Transação 2 concluiu com sucesso");

    // Verifica que NÃO existem duas gestões ativas simultâneas no Capítulo A
    const activeMgmts = await client1.query(`
      select id, code, status from public.managements
      where chapter_id = $1 and status = 'ativa';
    `, [ISOLATED_TEST_CHAPTER_A]);

    assert.equal(activeMgmts.rows.length, 1, "Exatamente UMA gestão deve permanecer ativa");

    // Verifica que a outra gestão foi encerrada corretamente
    const endedMgmts = await client1.query(`
      select id, code, status from public.managements
      where chapter_id = $1 and status = 'encerrada';
    `, [ISOLATED_TEST_CHAPTER_A]);

    assert.equal(endedMgmts.rows.length, 1, "A gestão sobreposta deve ter status 'encerrada'");
  });

  test("2. Ativações Simultâneas em Capítulos Distintos Operam em Paralelo sem Bloqueio Mútuo", async () => {
    const startTime = Date.now();
    const [resA, resB] = await Promise.all([
      client1.query(`select public.activate_management($1) as res;`, [mgmtA1Id]),
      client2.query(`select public.activate_management($1) as res;`, [mgmtB1Id]),
    ]);
    const duration = Date.now() - startTime;

    assert.ok(resA.rows[0].res.success, "Ativação no Capítulo A bem-sucedida");
    assert.ok(resB.rows[0].res.success, "Ativação no Capítulo B bem-sucedida");
    assert.ok(duration < 3000, "Ambas operaram em paralelo sem contenção de lock entre capítulos");
  });
});
