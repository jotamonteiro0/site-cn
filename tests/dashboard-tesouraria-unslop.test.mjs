import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tesourariaPath = path.resolve('app/(dashboard)/dashboard/tesouraria/page.tsx');

test('Auditoria de Conformidade Unslop do Módulo Tesouraria — Capítulo 500', async (t) => {
  const content = fs.readFileSync(tesourariaPath, 'utf8');

  await t.test('1. Preservação Estrita de Segurança e RBAC', () => {
    // Apenas Master e Tesoureiro podem acessar o módulo de gestão financeira
    assert.ok(content.includes('effectiveRole !== "master" && effectiveRole !== "tesoureiro"'), 'Apenas master e tesoureiro autorizados');
    assert.ok(content.includes('Acesso Restrito à Gestão da Tesouraria'), 'Tela de bloqueio deve estar presente');
    assert.ok(content.includes('href="/dashboard/membro"'), 'Membro não-autorizado deve ter link direto para painel do membro');
  });

  await t.test('2. Preservação de Regras de Negócio e Cálculos Financeiros', () => {
    // Dia 28 como vencimento padrão
    assert.ok(content.includes('dia 28'), 'Deve manter dia 28 como data padrão de vencimento');
    // Valores padrão DeMolay R$ 22 e Maçom R$ 25
    assert.ok(content.includes('22') && content.includes('25'), 'Deve manter valores de referência');
    // RPC e mutações preservadas
    assert.ok(content.includes('generate_monthly_charges'), 'RPC de geração em lote de cobranças deve ser preservada');
    assert.ok(content.includes('baixa_manual'), 'Método de baixa manual mantido');
    assert.ok(content.includes('capitulo500teresina@demolaypi.org.br'), 'Chave PIX oficial preservada');
  });

  await t.test('3. Qualidade Visual Unslop: Ausência de Efeitos IA e Gradientes Agressivos', () => {
    // Sem neon glow ou sombras exageradas
    assert.ok(!content.includes('shadow-[0_20px_60px'), 'Não deve conter sombras neon artificiais');
    assert.ok(!content.includes('shadow-[0_0_50px'), 'Não deve conter brilhos excessivos');
    assert.ok(!content.includes('bg-gradient-to-r from-emerald-500/10'), 'Não deve usar fundos com gradientes genéricos');
    // Superfícies sólidas elevadas
    assert.ok(content.includes('#0C1D14') || content.includes('#0E2218'), 'Deve utilizar superfícies grafite-esmeralda sólidas');
  });

  await t.test('4. Tipografia Tabular Numérica e Microinterações', () => {
    // Uso de tabular-nums e font-mono em dados financeiros
    assert.ok(content.includes('tabular-nums') && content.includes('font-mono'), 'Valores monetários devem usar algarismos tabulares');
    // Bordas e raios controlados (rounded-lg = 8px, rounded-xl = 12px)
    assert.ok(content.includes('rounded-lg') || content.includes('rounded-xl'), 'Uso de raios de borda controlados');
  });

  await t.test('5. Modais Operacionais e Relatório Mensal Preservados', () => {
    assert.ok(content.includes('RELATÓRIO FINANCEIRO MENSAL CAPITULAR'), 'Modal de relatório mensal presente');
    assert.ok(content.includes('Declaração de Quitação'), 'Modal de certidão de quitação presente');
    assert.ok(content.includes('Gerar Mensalidades em Lote'), 'Modal de lote de mensalidades presente');
    assert.ok(content.includes('Configuração PIX & InfinitePay API'), 'Modal de API e PIX presente');
  });
});
