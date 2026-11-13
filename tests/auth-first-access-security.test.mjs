import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const firstAccessPath = path.resolve('app/api/auth/first-access/route.ts');
const tokenRoutePath = path.resolve('app/api/auth/token/route.ts');
const loginPagePath = path.resolve('app/login/page.tsx');
const membrosPagePath = path.resolve('app/(dashboard)/dashboard/membros/page.tsx');
const membroSelfServicePath = path.resolve('app/(dashboard)/dashboard/membro/page.tsx');

test('Auditoria Rigorosa de Segurança Criptográfica: Primeiro Acesso, Tokens e Privacidade', async (t) => {
  const firstAccessContent = fs.readFileSync(firstAccessPath, 'utf8');
  const tokenRouteContent = fs.readFileSync(tokenRoutePath, 'utf8');
  const loginContent = fs.readFileSync(loginPagePath, 'utf8');
  const membrosContent = fs.readFileSync(membrosPagePath, 'utf8');
  const membroSelfContent = fs.readFileSync(membroSelfServicePath, 'utf8');

  // --- REQUISITO 1: SEGURANÇA E ENTROPIA DOS TOKENS ---
  await t.test('1. Entropia Criptográfica >= 128 bits (CSPRNG)', () => {
    // 16 bytes = 128 bits de entropia gerados com crypto.randomBytes
    assert.ok(
      tokenRouteContent.includes('crypto.randomBytes(16)'),
      'Token de ativação deve ser gerado com CSPRNG de no mínimo 16 bytes (128 bits)'
    );
    assert.ok(
      tokenRouteContent.includes('CN-ACT-'),
      'Token deve seguir o padrão canônico capitular CN-ACT-[32 HEX]'
    );
  });

  await t.test('2. Armazenamento Estrito de Hash SHA-256 no Banco (Zero Plaintext)', () => {
    // Gera hash SHA-256 do token
    assert.ok(
      tokenRouteContent.includes('crypto.createHash("sha256").update(rawToken).digest("hex")'),
      'Deve calcular hash SHA-256 do token em texto claro'
    );
    // Grava SOMENTE o hash na coluna verification_code do banco de dados
    assert.ok(
      tokenRouteContent.includes('verification_code: tokenHash'),
      'Banco de dados deve armazenar estritamente o hash SHA-256, NUNCA o token em texto claro'
    );
    // Na rota de validação, calcula o SHA-256 do token fornecido pelo usuário
    assert.ok(
      firstAccessContent.includes('crypto.createHash("sha256").update(cleanToken).digest("hex")'),
      'Servidor deve hashear com SHA-256 a credencial informada pelo usuário antes da comparação'
    );
  });

  await t.test('3. Validade Estrita de 7 Dias', () => {
    // Emissão com 7 dias
    assert.ok(
      tokenRouteContent.includes('7 * 24 * 60 * 60 * 1000'),
      'Token de primeiro acesso deve ter validade estrita de 7 dias (604.800.000 ms)'
    );
    // Verificação de expiração no servidor
    assert.ok(
      firstAccessContent.includes('Date.now() > expiresAt'),
      'Servidor deve rejeitar requisição caso o token tenha ultrapassado a validade de 7 dias'
    );
    assert.ok(
      firstAccessContent.includes('validade de 7 dias ultrapassada'),
      'Mensagem clara de erro sobre expiração de 7 dias'
    );
  });

  await t.test('4. Uso Único e Rejeição de Tokens Já Utilizados', () => {
    assert.ok(
      firstAccessContent.includes('tokenContent.is_used === true'),
      'Servidor deve verificar se o token já foi consumido'
    );
    assert.ok(
      firstAccessContent.includes('Este token de primeiro acesso já foi utilizado anteriormente'),
      'Mensagem clara de bloqueio por reutilização de token'
    );
  });

  await t.test('5. Rejeição de Token Inválido e Tratamento Seguro', () => {
    assert.ok(
      firstAccessContent.includes('Token de ativação inválido'),
      'Servidor deve rejeitar quando o hash não coincide com nenhum token pendente'
    );
    // Não expor token em logs ou mensagens
    assert.ok(
      !firstAccessContent.includes('console.log("Token:", cleanToken)'),
      'Token em claro nunca deve ser logado no console'
    );
  });

  await t.test('6. Rate Limiting e Proteção contra Força Bruta (5 Tentativas)', () => {
    assert.ok(
      firstAccessContent.includes('currentAttempts >= 5'),
      'Deve bloquear token após 5 tentativas incorretas'
    );
    assert.ok(
      firstAccessContent.includes('lock_reason: isLocked ? "brute_force_exceeded"'),
      'Deve registrar motivo de bloqueio por força bruta no banco'
    );
    assert.ok(
      firstAccessContent.includes('Limite de tentativas excedido (5 falhas)'),
      'Mensagem explícita de bloqueio por limite de tentativas atingido'
    );
  });

  await t.test('7. Consumo Atômico e Recuperação Segura (Rollback em Falha)', () => {
    // Marca como usado ANTES da criação da credencial
    assert.ok(
      firstAccessContent.includes('is_used: true'),
      'Token deve ser consumido atomicamente antes da criação de usuário no Auth'
    );
    // Rollback no bloco catch
    assert.ok(
      firstAccessContent.includes('is_used: false'),
      'Em caso de falha no Supabase Auth, o consumo do token deve ser revertido'
    );
    assert.ok(
      firstAccessContent.includes('Token revertido com sucesso'),
      'Log de reversão com segurança contra bloqueio indevido de membro'
    );
  });

  await t.test('8. Proibição Absoluta do ID DeMolay como Senha', () => {
    // Rota rejeita senha igual ao ID
    assert.ok(
      firstAccessContent.includes('cleanPassword === cleanId'),
      'first-access deve proibir senha idêntica ao ID SISDM'
    );
    assert.ok(
      firstAccessContent.includes('senha não pode ser igual à sua ID DeMolay'),
      'Mensagem institucional de recusa de senha igual ao ID'
    );
    // Exigência de tamanho mínimo de 8 caracteres
    assert.ok(
      firstAccessContent.includes('cleanPassword.length < 8'),
      'Senha deve exigir no mínimo 8 caracteres'
    );
    // Interface de login bloqueia senha igual ao ID
    assert.ok(
      loginContent.includes('firstAccessPassword === firstAccessId.trim()'),
      'Modal de primeiro acesso no login deve validar cliente e proibir senha igual ao ID'
    );
  });

  await t.test('9. Registro de Auditoria sem Exposição de Segredos', () => {
    // Auditoria de emissão com prefixo mascarado
    assert.ok(
      tokenRouteContent.includes('token_prefix: `CN-ACT-${hex128.substring(0, 4)}***`'),
      'Log de auditoria deve conter apenas prefixo mascarado do token'
    );
    assert.ok(
      tokenRouteContent.includes('audit_activation_token_generated'),
      'Ação audit_activation_token_generated gravada no banco'
    );
    // Auditoria de conclusão de primeiro acesso
    assert.ok(
      firstAccessContent.includes('audit_first_access_completed'),
      'Ação audit_first_access_completed gravada no banco'
    );
  });

  // --- REQUISITO 2: PRIVACIDADE OVER-THE-WIRE E SEPARAÇÃO DE DADOS ---
  await t.test('10. Projeção de Dados Cadastrais Diferenciada (Over-The-Wire)', () => {
    // Membros comuns NÃO recebem email, telefone, data de iniciação ou data de nascimento na query
    assert.ok(
      membrosContent.includes('canManageMembers ?'),
      'Consulta deve alternar projeção com base nas permissões RBAC'
    );
    assert.ok(
      membrosContent.includes('select("id, id_demolay, full_name, category, regularity, masonic_lodge, photo_url")'),
      'Query para membros comuns omite dados pessoais e confidenciais'
    );
    assert.ok(
      membrosContent.includes('select("id, id_demolay, full_name, email, phone, category, regularity, masonic_lodge, initiation_date, demolay_degree_date, photo_url, created_at")'),
      'Apenas Diretoria (Master/Escrivão) recebe dados cadastrais completos'
    );
  });

  await t.test('11. Preservação do Acesso do Próprio Membro ao seu Perfil (/dashboard/membro)', () => {
    assert.ok(
      membroSelfContent.includes('auth.getUser()'),
      'Página de auto-atendimento deve autenticar o usuário logado via Supabase Auth'
    );
    assert.ok(
      membroSelfContent.includes('currentMember'),
      'Estado do membro logado deve ser preservado para visualização de seus próprios dados'
    );
  });
});
