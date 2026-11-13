import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { authenticGestaoDocuments } from "../lib/data/historicalGestaoDocs.ts";
import { authenticAtasDocuments } from "../lib/data/historicalAtasDocs.ts";
import { scdbGeneralManuals, scdbPublicCeremonies } from "../lib/data/scdbDocs.ts";

describe("Auditoria de Documentos Oficiais, Gestão de Atas e Conformidade DeMolay", () => {
  test("1. Conformidade DeMolay: Ausência estrita do termo maçônico proibido 'balaústre'", () => {
    const rootDir = process.cwd();
    const targetDirs = ["app", "lib", "public"];

    function checkFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (![".next", "node_modules", ".git"].includes(entry.name)) {
            checkFiles(fullPath);
          }
        } else if (entry.isFile() && /\.(tsx?|jsx?|json|md)$/i.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf8");
          const match = content.match(/bala[uú]stre/i);
          assert.equal(
            match,
            null,
            `Encontrado termo proibido 'balaústre' no arquivo ${path.relative(rootDir, fullPath)}`
          );
        }
      }
    }

    for (const d of targetDirs) {
      if (fs.existsSync(path.join(rootDir, d))) {
        checkFiles(path.join(rootDir, d));
      }
    }
  });

  test("2. Organização das Atas: 100% das Atas são classificadas estritamente por Gestão Capitular", () => {
    assert.ok(authenticAtasDocuments.length >= 20, "Devem existir ao menos 20 atas autênticas catalogadas");

    const validManagements = [
      "Gestão XXIII (2025.2)",
      "Gestão XXIV (2026.1)",
      "Gestão XXV (2026.2)",
    ];

    for (const ata of authenticAtasDocuments) {
      assert.ok(
        validManagements.includes(ata.management),
        `Ata '${ata.title}' possui gestão inválida ou não especificada: ${ata.management}`
      );
      assert.ok(ata.fileName.startsWith("Ata_"), `Nome do arquivo da ata deve iniciar com Ata_: ${ata.fileName}`);
      assert.ok(ata.title.startsWith("Ata"), `Título oficial da ata deve iniciar com 'Ata': ${ata.title}`);
    }
  });

  test("3. Integridade do Acervo Capitular: Documentos de Gestão possuem arquivos reais e vinculação oficial", () => {
    assert.ok(authenticGestaoDocuments.length >= 22, "Devem existir ao menos 22 atos/editais autênticos");

    for (const doc of authenticGestaoDocuments) {
      assert.ok(doc.management, `Documento de gestão deve ter 'management' definido: ${doc.title}`);
      assert.ok(doc.fileName.endsWith(".pdf"), `Documento deve ser PDF oficial: ${doc.fileName}`);
      assert.ok(doc.mcName, `Documento de gestão deve indicar o MC responsável: ${doc.title}`);
    }
  });

  test("4. Acervo SCDB: Manuais e Cerimônias Públicas possuem identificação e títulos oficiais padronizados", () => {
    assert.ok(scdbGeneralManuals.length >= 13, "Devem existir ao menos 13 manuais gerais do SCDB");
    assert.ok(scdbPublicCeremonies.length >= 30, "Devem existir ao menos 30 cerimônias públicas do SCDB");

    // Vade Mecum DeMolay e Compêndio das Supremas Instruções são fundamentais
    const hasVadeMecum = scdbGeneralManuals.some((m) => m.fileName === "Vade Mecum DeMolay.pdf");
    const hasCompendio = scdbGeneralManuals.some((m) => m.fileName === "Compêndio das Supremas Instruções.pdf");
    assert.ok(hasVadeMecum, "Vade Mecum DeMolay deve constar no acervo de manuais gerais");
    assert.ok(hasCompendio, "Compêndio das Supremas Instruções deve constar no acervo de manuais gerais");
  });
});
