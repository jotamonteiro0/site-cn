import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const membrosPath = path.resolve('app/(dashboard)/dashboard/membros/page.tsx');
const tokenRoutePath = path.resolve('app/api/auth/token/route.ts');

test('Auditoria de Conformidade Unslop do Módulo Quadro de Membros — Capítulo 500', async (t) => {
  const content = fs.readFileSync(membrosPath, 'utf8');
  const tokenContent = fs.readFileSync(tokenRoutePath, 'utf8');

  await t.test('1. Preservação Rigorosa de RBAC e Controle de Acesso', () => {
    // Sincronização de papéis e modo membro
    assert.ok(content.includes('userRole'), 'Deve verificar userRole');
    assert.ok(content.includes('viewAsMember'), 'Deve sincronizar viewAsMember');
    assert.ok(content.includes('effectiveRole = viewAsMember ? "membro" : userRole'), 'effectiveRole com fallback');
    assert.ok(content.includes('canManageMembers = effectiveRole === "master" || effectiveRole === "escrivao"'), 'Apenas Master e Escrivão gerenciam');

    // Ações condicionadas
    assert.ok(content.includes('{canManageMembers && ('), 'Botão habilitar membro condicionado');
    assert.ok(content.includes('Apenas o Mestre Conselheiro ou Escrivão podem habilitar novos membros.'), 'Trava de cadastro');
    assert.ok(content.includes('Apenas o Mestre Conselheiro ou Escrivão podem editar informações de membros.'), 'Trava de edição');
  });

  await t.test('2. Categorias Canônicas e Identificação Visual Oficial', () => {
    assert.ok(content.includes('demolay_ativo'), 'Categoria DeMolay Ativo');
    assert.ok(content.includes('senior_demolay'), 'Categoria Sênior DeMolay');
    assert.ok(content.includes('macom'), 'Categoria Tio Maçom');
    assert.ok(content.includes('irregular'), 'Categoria Irregular');
    // Rótulos e badges oficiais
    assert.ok(content.includes('Todos os Membros'), 'Aba Todos');
    assert.ok(content.includes('DeMolays Ativos'), 'Aba DeMolays Ativos');
    assert.ok(content.includes('Tios Maçons / Consultores'), 'Aba Maçons / Consultores');
    assert.ok(content.includes('Sêniores DeMolay'), 'Aba Sêniores DeMolay');
  });

  await t.test('3. Cadastro, Edição e Visualização Individual de Perfil', () => {
    // Cadastro de novo membro
    assert.ok(content.includes('handleCreateMember'), 'Função de habilitar membro presente');
    assert.ok(content.includes('initiation_date'), 'Data de iniciação requerida');
    assert.ok(content.includes('id_demolay'), 'ID SISDM requerida');

    // Edição de membros
    assert.ok(content.includes('handleUpdateMember'), 'Função de atualização de dados presente');
    assert.ok(content.includes('isEditModalOpen'), 'Modal de edição cadastral presente');
    assert.ok(content.includes('Editar Cadastro do Membro'), 'Título do modal de edição');

    // Visualização individual de perfil
    assert.ok(content.includes('selectedMemberForView'), 'Estado de membro selecionado para perfil');
    assert.ok(content.includes('Perfil Institucional do Membro'), 'Modal de perfil institucional');
  });

  await t.test('4. Segurança de Credenciais Iniciais: Ausência Estrita de ID como Senha', () => {
    // Proibição de utilizar ID como senha padrão
    assert.ok(!content.includes('senha inicial: ${newMember.id_demolay'), 'NUNCA deve sugerir ID como senha inicial');
    assert.ok(!content.includes('Sua ID será sua senha inicial'), 'NUNCA deve definir ID como senha de acesso');

    // Geração de token criptográfico temporário via endpoint seguro
    assert.ok(content.includes('/api/auth/token'), 'Frontend deve requisitar token ao endpoint seguro');
    assert.ok(tokenContent.includes('CN-ACT-'), 'Deve gerar token de ativação no padrão capitular');
    assert.ok(content.includes('setTokenModalData'), 'Deve exibir modal com o token e instruções seguras');
    assert.ok(content.includes('handleGenerateNewToken'), 'Diretoria pode gerar novo token a qualquer momento');
    assert.ok(tokenContent.includes('7 * 24 * 60 * 60 * 1000'), 'Validade estrita de 7 dias para o token');
  });

  await t.test('5. Privacidade e Separação Rigorosa de Dados Cadastrais', () => {
    // Consulta diferenciada no Supabase por nível de acesso
    assert.ok(content.includes('canManageMembers ?'), 'Deve condicionar os campos da query ao perfil do usuário');
    // Membros comuns NÃO recebem email/telefone/datas privadas na query
    assert.ok(
      content.includes('select("id, id_demolay, full_name, category, regularity, masonic_lodge, photo_url")'),
      'Membros comuns recebem apenas dados institucionais públicos'
    );

    // Na interface: aviso de privacidade para membros comuns
    assert.ok(content.includes('Informações de contato e dados administrativos são restritos à Diretoria'), 'Aviso de privacidade presente');
  });

  await t.test('6. Qualidade Visual Unslop: Superfícies Sólidas e Ausência de AI Slop', () => {
    // Sem classes legadas de vidro ou efeitos artificiais
    assert.ok(!content.includes('btn-heraldico-vidro'), 'Sem classes legadas de vidro');
    assert.ok(!content.includes('btn-heraldico-ouro'), 'Sem botões dourados legados');
    assert.ok(!content.includes('ios-glass-card'), 'Sem cards de vidro ios');
    assert.ok(!content.includes('rounded-3xl'), 'Sem raios gigantescos (rounded-3xl)');

    // Superfícies sólidas elevadas
    assert.ok(content.includes('#0C1D14'), 'Painel escuro #0C1D14');
    assert.ok(content.includes('#0E2218'), 'Cards elevados #0E2218');
    assert.ok(content.includes('#08140E'), 'Superfície de controle #08140E');
  });

  await t.test('7. Tipografia Tabular Numérica e Filtros em Tempo Real', () => {
    assert.ok(content.includes('tabular-nums') && content.includes('font-mono'), 'Uso de algarismos tabulares');
    assert.ok(content.includes('regularityFilter'), 'Filtro secundário de regularidade');
    assert.ok(content.includes('searchTerm'), 'Pesquisa em tempo real');
  });
});
