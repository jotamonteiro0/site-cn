import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const chamadaPath = path.resolve('app/(dashboard)/dashboard/chamada/page.tsx');

test('Auditoria de Conformidade Unslop do Módulo Atas e Chamada da Reunião — Capítulo 500', async (t) => {
  const content = fs.readFileSync(chamadaPath, 'utf8');

  await t.test('1. Preservação Rigorosa de RBAC e Separação de Papéis', () => {
    // Verificação de permissões do usuário e modo membro
    assert.ok(content.includes('userRole'), 'Deve conter verificação de userRole');
    assert.ok(content.includes('viewAsMember'), 'Deve sincronizar com viewAsMember');
    assert.ok(content.includes('effectiveRole = viewAsMember ? "membro" : userRole'), 'effectiveRole deve respeitar modo membro');
    assert.ok(content.includes('isMaster = effectiveRole === "master" || effectiveRole === "admin"'), 'isMaster deve ser estrito');
    assert.ok(content.includes('canManageAttendance = isMaster || effectiveRole === "escrivao"'), 'Apenas Master e Escrivão gerenciam chamada');

    // Ações exclusivas de Master
    assert.ok(content.includes('{isMaster && ('), 'Ações exclusivas de Master no cabeçalho');
    assert.ok(content.includes('getGoogleCalendarUrl(selectedMeeting)'), 'Link do Google Agenda condicionado a Master');
    assert.ok(content.includes('setIsConvocationModalOpen(true)'), 'Convocação oficial condicionada a Master');
    assert.ok(content.includes('Editar Reunião'), 'Edição de reunião restrita');
    assert.ok(content.includes('Nova Reunião'), 'Cadastro de reunião restrito');

    // Ações de Escrivão e Master
    assert.ok(content.includes('canManageAttendance ? ('), 'Chamada e ata condicionadas a canManageAttendance');
    assert.ok(content.includes('Modo Leitura (Membro)'), 'Modo leitura para membros comuns');
    assert.ok(content.includes('Salvar no Livro de Atas'), 'Gravação de ata no livro oficial');

    // Travas em manipuladores de eventos
    assert.ok(content.includes('Acesso restrito à Diretoria para salvar a chamada.'), 'Trava de salvar chamada');
    assert.ok(content.includes('Acesso restrito à Diretoria para registrar atas.'), 'Trava de registrar ata');
    assert.ok(content.includes('Acesso restrito ao Mestre Conselheiro/Master para cadastrar ou editar reuniões.'), 'Trava de reunião');
  });

  await t.test('2. Conformidade DeMolay e Ausência de Termos Proibidos', () => {
    // Proibição expressa do termo maçônico "balaústre"
    assert.ok(!content.match(/bala[uú]stre/i), 'Termo proibido balaústre não pode existir');
    // Uso canônico de "Ata", "Livro de Atas", "Reunião" e "Sessão"
    assert.ok(content.includes('LIVRO DE ATAS DA SESSÃO'), 'Livro de Atas oficial presente');
    assert.ok(content.includes('Ata Oficial'), 'Identificação oficial da ata');
  });

  await t.test('3. Regras Litúrgicas DeMolay e Vade Mecum SCDB (Art. 216)', () => {
    // Helper de domingos
    assert.ok(content.includes('isSunday'), 'Validador de reuniões aos domingos');
    // Validador de dias obrigatórios
    assert.ok(content.includes('getMandatoryDaysForDate'), 'Helper de dias obrigatórios SCDB');
    assert.ok(content.includes('getMandatoryDayWarning'), 'Avisos litúrgicos do Vade Mecum');
    // Dias obrigatórios canônicos
    assert.ok(content.includes('Dia em Memória a Jacques DeMolay'), 'Dia Jacques DeMolay');
    assert.ok(content.includes('Dia das Mães (SCDB)'), 'Dia das Mães');
    assert.ok(content.includes('Dia dos Pais (SCDB)'), 'Dia dos Pais');
    assert.ok(content.includes('Dia do Patriota (SCDB)'), 'Dia do Patriota');
    assert.ok(content.includes('Dia Educacional (SCDB)'), 'Dia Educacional');
    assert.ok(content.includes('Dia em Memória a Frank S. Land'), 'Dia Frank S. Land');
    assert.ok(content.includes('Dia DeMolay de Conforto (SCDB)'), 'Dia de Conforto');
  });

  await t.test('4. Qualidade Visual Unslop: Superfícies Sólidas e Ausência de AI Slop', () => {
    // Sem neon glow ou classes de vidro ultrapassadas
    assert.ok(!content.includes('btn-heraldico-vidro'), 'Sem classes legadas de vidro');
    assert.ok(!content.includes('btn-heraldico-ouro'), 'Sem botões legados');
    assert.ok(!content.includes('card-heraldico-dark'), 'Sem cards legados');
    assert.ok(!content.includes('rounded-3xl'), 'Sem raios gigantescos artificiais (rounded-3xl)');
    // Presença de superfícies sólidas elevadas
    assert.ok(content.includes('#0C1D14'), 'Painel escuro #0C1D14');
    assert.ok(content.includes('#0E2218'), 'Cards elevados #0E2218');
    assert.ok(content.includes('#08140E'), 'Superfície de controle #08140E');
  });

  await t.test('5. Tipografia Tabular e Métricas de Presença', () => {
    assert.ok(content.includes('tabular-nums') && content.includes('font-mono'), 'Deve usar tabular-nums em contadores e percentuais');
    assert.ok(content.includes('demolayStats.presentes'), 'Contagem de DeMolays presentes mantida');
    assert.ok(content.includes('macomStats.presentes'), 'Contagem de Maçons presentes mantida');
    assert.ok(content.includes('visitingDemolays.length'), 'Contagem de DeMolays visitantes mantida');
    assert.ok(content.includes('visitingMasons.length'), 'Contagem de Maçons visitantes mantida');
  });

  await t.test('6. Modais Operacionais Preservados', () => {
    assert.ok(content.includes('isMeetingModalOpen'), 'Modal de reunião presente');
    assert.ok(content.includes('isDemolayVisitorModalOpen'), 'Modal de DeMolay visitante presente');
    assert.ok(content.includes('isMasonVisitorModalOpen'), 'Modal de Maçom visitante presente');
    assert.ok(content.includes('isConvocationModalOpen'), 'Modal de convocação oficial presente');
  });
});
