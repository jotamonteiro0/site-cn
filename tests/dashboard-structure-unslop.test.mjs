import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

describe("Auditoria de Conformidade Unslop da Estrutura do Dashboard — Capítulo 500", () => {
  const layoutPath = path.join(rootDir, "app/(dashboard)/layout.tsx");
  const headerPath = path.join(rootDir, "components/dashboard/DashboardHeader.tsx");
  const sidebarPath = path.join(rootDir, "components/dashboard/Sidebar.tsx");
  const overviewPath = path.join(rootDir, "app/(dashboard)/dashboard/page.tsx");

  test("1. Layout Shell: Fundo grafite-esmeralda e integração Sidebar + DashboardHeader", () => {
    assert.ok(fs.existsSync(layoutPath), "layout.tsx deve existir");
    const content = fs.readFileSync(layoutPath, "utf-8");
    assert.match(content, /DashboardHeader/, "Layout deve integrar o DashboardHeader");
    assert.match(content, /Sidebar/, "Layout deve integrar a Sidebar");
    assert.match(content, /#08140E/, "Fundo do dashboard deve utilizar o tom sólido grafite-esmeralda (#08140E)");
  });

  test("2. Cabeçalho Executivo: Identificação de gestão ativa XXV, conexão e chip de usuário", () => {
    assert.ok(fs.existsSync(headerPath), "DashboardHeader.tsx deve existir");
    const content = fs.readFileSync(headerPath, "utf-8");
    assert.match(content, /Gestão XXV/, "Cabeçalho deve identificar a Gestão XXV ativa");
    assert.match(content, /Ver Site/, "Cabeçalho deve possuir atalho para o portal público");
    assert.match(content, /roleDisplayMap/, "Cabeçalho deve mapear perfis e cores institucionais");
  });

  test("3. Sidebar: Navegação lateral limpa com preservação estrita de RBAC e upload de foto", () => {
    assert.ok(fs.existsSync(sidebarPath), "Sidebar.tsx deve existir");
    const content = fs.readFileSync(sidebarPath, "utf-8");
    assert.match(content, /#0C1A13/, "Sidebar deve utilizar superfície sólida elevada (#0C1A13)");
    assert.match(content, /allowedNavigation/, "Sidebar deve preservar filtragem dinâmica de rotas permitidas");
    assert.match(content, /viewAsMember/, "Sidebar deve preservar alternador 'Ver como Membro'");
    assert.match(content, /ProfilePhotoCropper/, "Sidebar deve manter integração com corte de foto de perfil");
  });

  test("4. Visão Geral: Métricas essenciais, próxima sessão e módulos sem neon glow", () => {
    assert.ok(fs.existsSync(overviewPath), "dashboard/page.tsx deve existir");
    const content = fs.readFileSync(overviewPath, "utf-8");
    assert.match(content, /tabular-nums/, "Visão geral deve utilizar numerais tabulares");
    assert.match(content, /Gestão XXV/, "Visão geral deve identificar a Gestão XXV ativa");
    assert.match(content, /DeMolays Ativos/, "Card 1: DeMolays Ativos");
    assert.match(content, /Conselho Consultivo/, "Card 2: Conselho Consultivo");
    assert.match(content, /Sêniores DeMolay/, "Card 3: Sêniores DeMolay");
    assert.match(content, /Mensalidade/, "Card 4: Mensalidade Capitular");
  });
});
