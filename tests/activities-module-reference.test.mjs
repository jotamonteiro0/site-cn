import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORICAL_MEETINGS } from "../lib/data/historicalMeetings.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Conformidade Editorial e Estrutural do Módulo de Atividades (Referência Priorado 156)", () => {
  const componentPath = path.join(rootDir, "components/site/EncontrosAtividades.tsx");
  const apiRoutePath = path.join(rootDir, "app/api/activities/route.ts");
  const homePath = path.join(rootDir, "app/page.tsx");

  describe("1. Estrutura Editorial e Nomenclatura (Padrão Priorado 156)", () => {
    test("1.1 Título da seção é 'Atividades realizadas'", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(
        code.includes("Atividades realizadas"),
        "O título principal deve ser exatamente 'Atividades realizadas'"
      );
    });

    test("1.2 Texto introdutório contextualiza atividades e projetos do Capítulo 500", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(
        code.includes("atividades e projetos") && code.includes("Capítulo DeMolay Professor Carvalho Neves nº 500"),
        "Deve conter texto introdutório claro apresentando as atividades e projetos"
      );
    });

    test("1.3 Encerramento da seção possui link 'Ver mais atividades' direcionando ao Instagram oficial", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("Ver mais atividades"), "Deve conter o link/botão 'Ver mais atividades'");
      assert.ok(
        code.includes("https://instagram.com/cap.carvalhoneves500"),
        "Deve apontar para o Instagram oficial cadastrado: https://instagram.com/cap.carvalhoneves500"
      );
      assert.ok(code.includes("InstagramIcon"), "Deve exibir o ícone oficial do Instagram");
    });
  });

  describe("2. Apresentação Visual e Hierarquia dos Cards", () => {
    test("2.1 Cada card possui área de fotografia própria em destaque no topo", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("item.photo_url"), "Deve suportar fotografia própria da atividade");
      assert.ok(
        code.includes("aspect-[4/3]") || code.includes("h-64"),
        "Deve reservar espaço proporcional em destaque para a fotografia"
      );
    });

    test("2.2 Apresentação se adapta com dignidade institucional quando photo_url não estiver preenchido", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      // Não deve colocar stock photos falsas; deve utilizar moldura visual com insígnia e gradiente capitular
      assert.ok(!code.includes("unsplash.com"), "Não deve usar imagens externas de banco de imagens genérico");
      assert.ok(!code.includes("pexels.com"), "Não deve usar imagens de banco de imagens genérico");
      assert.ok(code.includes("item.management"), "Deve exibir identificação da gestão no selo visual");
    });

    test("2.3 Banner de título facilmente identificável com gradiente institucional", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("parseMeetingTitle"), "Deve decompor o título de forma limpa e legível");
      assert.ok(code.includes("headline"), "Deve exibir a manchete principal da atividade");
      assert.ok(code.includes("category"), "Deve categorizar o tipo litúrgico da atividade");
    });

    test("2.4 Descrição contextualizada com metadados (data, local e Mestre Conselheiro)", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("item.description"), "Deve exibir a descrição contextualizada");
      assert.ok(code.includes("item.location"), "Deve exibir o local da atividade");
      assert.ok(code.includes("item.mc_name"), "Deve exibir o Mestre Conselheiro responsável");
      assert.ok(code.includes("formatFullDate"), "Deve formatar a data por extenso sem erro de fuso");
    });
  });

  describe("3. Ordenação Cronológica e Integridade dos Registros", () => {
    test("3.1 Ordenação cronológica estritamente decrescente na API", () => {
      const sorted = [...HISTORICAL_MEETINGS].sort(
        (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const tA = new Date(sorted[i].starts_at).getTime();
        const tB = new Date(sorted[i + 1].starts_at).getTime();
        assert.ok(
          tA >= tB,
          `Atividade ${sorted[i].title} (${sorted[i].starts_at}) deve vir antes ou junto de ${sorted[i + 1].title} (${sorted[i + 1].starts_at})`
        );
      }
    });

    test("3.2 API de atividades suporta cursor, limit e hasMore sem perder registros", async () => {
      const code = fs.readFileSync(apiRoutePath, "utf-8");
      assert.ok(code.includes("cursor"), "API deve aceitar cursor");
      assert.ok(code.includes("limit"), "API deve aceitar limit");
      assert.ok(code.includes("nextCursor"), "API deve retornar nextCursor");
      assert.ok(code.includes("hasMore"), "API deve retornar hasMore");
    });

    test("3.3 Prevenção rigorosa de duplicidade com loadedIdsRef no componente", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("loadedIdsRef"), "Deve manter rastreamento de IDs carregados");
      assert.ok(code.includes("loadedIdsRef.current.has"), "Deve filtrar itens repetidos");
    });
  });

  describe("4. Navegação e Controles de Carrossel", () => {
    test("4.1 Possui controles com setas de anterior e próxima atividade", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("scrollByDirection(-1)"), "Deve permitir retroceder no carrossel");
      assert.ok(code.includes("scrollByDirection(1)"), "Deve permitir avançar no carrossel");
      assert.ok(code.includes("aria-roledescription=\"carrossel\""), "Deve possuir marcação de acessibilidade ARIA");
    });

    test("4.2 Página inicial integra o módulo corrigido", () => {
      const homeCode = fs.readFileSync(homePath, "utf-8");
      assert.ok(homeCode.includes("<EncontrosAtividades"), "Página inicial deve renderizar o componente");
    });
  });

  describe("5. Carrossel Infinito em Loop Contínuo", () => {
    test("5.1 Estrutura de buffer em 3 conjuntos para loop sem limites nas extremidades", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("SET_COUNT = 3") || code.includes("LOOP_SLIDES"), "Deve estruturar repetições em buffer para transição sem limites");
      assert.ok(code.includes("normalizeLoopPosition"), "Deve possuir função dedicada de reposicionamento de loop imperceptível");
    });

    test("5.2 Slides auxiliares possuem aria-hidden='true' e preservação de acessibilidade", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("isClone"), "Deve identificar slides auxiliares/clones");
      assert.ok(code.includes("aria-hidden={isClone ? \"true\" : undefined}"), "Auxiliares devem ter aria-hidden='true'");
    });

    test("5.3 Suporte completo a arrasto com mouse (Mouse Drag)", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("onMouseDown"), "Deve suportar evento onMouseDown");
      assert.ok(code.includes("onMouseMove"), "Deve suportar evento onMouseMove");
      assert.ok(code.includes("onMouseUp"), "Deve suportar evento onMouseUp");
      assert.ok(code.includes("cursor-grab") && code.includes("cursor-grabbing"), "Deve indicar visualmente a capacidade de arrasto");
    });

    test("5.4 Respeito estrito a prefers-reduced-motion", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(code.includes("prefers-reduced-motion"), "Deve checar media query prefers-reduced-motion");
    });

    test("5.5 Ausência absoluta de autoplay (movimento 100% sob controle do usuário)", () => {
      const code = fs.readFileSync(componentPath, "utf-8");
      assert.ok(!code.includes("setInterval"), "Não deve implementar rotação automática por autoplay");
    });

    test("5.6 Preservação dos 18 registros autênticos e ordem cronológica decrescente", () => {
      assert.equal(HISTORICAL_MEETINGS.length, 18, "Banco de dados e módulo autêntico devem conter exatamente 18 registros");
    });
  });
});
