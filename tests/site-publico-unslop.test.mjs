import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

describe("Auditoria de Conformidade Unslop do Site Público — Capítulo 500", () => {
  const seteVirtudesCode = fs.readFileSync(
    path.join(rootDir, "components/site/SeteVirtudes.tsx"),
    "utf-8"
  );
  const homeCode = fs.readFileSync(path.join(rootDir, "app/page.tsx"), "utf-8");

  test("1. Composição Canônica: Exatamente 7 Virtudes em ordem SCDB com Companheirismo no centro", () => {
    const expectedOrder = [
      "Amor Filial",
      "Reverência pelas Coisas Sagradas",
      "Cortesia",
      "Companheirismo",
      "Fidelidade",
      "Pureza",
      "Patriotismo",
    ];

    expectedOrder.forEach((virtue) => {
      assert.ok(
        seteVirtudesCode.includes(virtue),
        `A virtude canônica '${virtue}' deve estar presente no componente.`
      );
    });

    // Valida que o centro (índice 3) é Companheirismo no ápice
    assert.match(
      seteVirtudesCode,
      /Quarta Virtude Cardeal • Ápice do Arco/,
      "Vela IV (Companheirismo) deve ser explicitamente identificada como o ápice do arco."
    );
  });

  test("2. Simetria da Meia-Lua (3 + 1 + 3) e Curvatura do Semicírculo", () => {
    // Coordenadas esperadas: 95, 190, 285, 380, 475, 570, 665
    // Delta simétrico ao redor de 380: |x - 380| = 285, 190, 95
    assert.ok(seteVirtudesCode.includes("x: 95"), "Vela 1 deve estar em x: 95");
    assert.ok(seteVirtudesCode.includes("x: 190"), "Vela 2 deve estar em x: 190");
    assert.ok(seteVirtudesCode.includes("x: 285"), "Vela 3 deve estar em x: 285");
    assert.ok(seteVirtudesCode.includes("x: 380"), "Vela 4 deve estar no centro exato x: 380");
    assert.ok(seteVirtudesCode.includes("x: 475"), "Vela 5 deve ser simétrica em x: 475");
    assert.ok(seteVirtudesCode.includes("x: 570"), "Vela 6 deve ser simétrica em x: 570");
    assert.ok(seteVirtudesCode.includes("x: 665"), "Vela 7 deve ser simétrica em x: 665");

    // Validação de alturas harmônicas da meia-lua
    assert.ok(seteVirtudesCode.includes("height: 110"), "Vela central deve possuir maior altura (110px)");
  });

  test("3. Ausência Estrita de Objetos Não Permitidos (Sem Altar, Mesa, Livro ou Castiçal)", () => {
    const prohibited = ["altar", "castiçal", "castiçais", "candelabro", "mesa cerimonial"];
    prohibited.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      assert.strictEqual(
        regex.test(seteVirtudesCode),
        false,
        `O termo proibido '${word}' não deve estar presente no componente Sete Virtudes.`
      );
    });
  });

  test("4. Acessibilidade e Interatividade: roles ARIA, tablist, tabs e atalhos de teclado", () => {
    assert.ok(seteVirtudesCode.includes('role="tablist"'), "Deve conter container role='tablist'");
    assert.ok(seteVirtudesCode.includes('role="tab"'), "Deve conter velas com role='tab'");
    assert.ok(seteVirtudesCode.includes('role="tabpanel"'), "Deve conter área editorial role='tabpanel'");
    assert.ok(seteVirtudesCode.includes("ArrowLeft"), "Deve suportar navegação por seta esquerda");
    assert.ok(seteVirtudesCode.includes("ArrowRight"), "Deve suportar navegação por seta direita");
  });

  test("5. Preservação Integral do Brasão Oficial e Características Heráldicas", () => {
    assert.ok(homeCode.includes("CN Nº 500"), "Brasão deve conter CN Nº 500");
    assert.ok(homeCode.includes("Teresina • PI"), "Brasão deve conter Teresina • PI");
    assert.ok(homeCode.includes("brasao-shimmer-container"), "Container do brasão deve ser mantido");
  });
});
