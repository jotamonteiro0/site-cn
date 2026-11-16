import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORICAL_MEETINGS } from "../lib/data/historicalMeetings.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const gestoesDir = path.resolve(rootDir, "public/gestoes");
const readmePath = path.resolve(gestoesDir, "README.md");
const syncScriptPath = path.resolve(rootDir, "scripts/sync-gestoes-readme.mjs");
const mcPhotosJsonPath = path.resolve(rootDir, "data/mc_photos.json");
const sitePubsPath = path.resolve(rootDir, "data/site_publications.json");
const homePagePath = path.resolve(rootDir, "app/page.tsx");
const gestoesPagePath = path.resolve(rootDir, "app/gestoes/page.tsx");
const gestaoDocsPath = path.resolve(rootDir, "lib/data/historicalGestaoDocs.ts");

describe("Auditoria Automatizada de Vínculos Oficiais de Mestres Conselheiros e Gestões", () => {
  test("1. README oficial e script sync-gestoes-readme.mjs refletem Gestões XXV e XXVI", () => {
    assert.ok(fs.existsSync(readmePath), "README.md de gestões deve existir");
    assert.ok(fs.existsSync(syncScriptPath), "sync-gestoes-readme.mjs deve existir");

    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    const syncContent = fs.readFileSync(syncScriptPath, "utf-8");

    // Gestão XXV (2026.2) deve ser Rafael Inácio do Nascimento de Morais
    assert.match(readmeContent, /\|\s*\*\*XXV\*\*\s*\|\s*2026\.2\s*\|\s*Rafael Inácio do Nascimento de Morais\s*\|\s*`rafael-inacio\.2026\.2\.jpg`/,
      "README deve mapear Gestão XXV para Rafael Inácio do Nascimento de Morais com rafael-inacio.2026.2.jpg");
    assert.match(syncContent, /numero:\s*"XXV",\s*periodo:\s*"2026\.2",\s*mc:\s*"Rafael Inácio do Nascimento de Morais",\s*file:\s*"rafael-inacio\.2026\.2\.jpg"/,
      "sync script deve mapear Gestão XXV para Rafael Inácio do Nascimento de Morais");

    // Gestão XXVI (2027.1) não deve presumir ocupante automaticamente
    assert.match(readmeContent, /\|\s*\*\*XXVI\*\*\s*\|\s*2027\.1\s*\|\s*A definir\s*\|\s*`pendente`/,
      "README deve manter Gestão XXVI como A definir / pendente");
    assert.match(syncContent, /numero:\s*"XXVI",\s*periodo:\s*"2027\.1",\s*mc:\s*"A definir"/,
      "sync script deve manter Gestão XXVI como A definir");
  });

  test("2. Arquivos físicos de imagem existem e são válidos em public/gestoes/", () => {
    const photoXXV = path.resolve(gestoesDir, "rafael-inacio.2026.2.jpg");
    const photoXXIV = path.resolve(gestoesDir, "jose-keltton.2026.1.jpg");
    const photoXXIII = path.resolve(gestoesDir, "joao-guilherme.2025.2.jpg");

    assert.ok(fs.existsSync(photoXXV), "Arquivo rafael-inacio.2026.2.jpg deve existir em public/gestoes/");
    assert.ok(fs.existsSync(photoXXIV), "Arquivo jose-keltton.2026.1.jpg deve existir em public/gestoes/");
    assert.ok(fs.existsSync(photoXXIII), "Arquivo joao-guilherme.2025.2.jpg deve existir em public/gestoes/");

    assert.ok(fs.statSync(photoXXV).size > 10000, "Foto da Gestão XXV deve ter tamanho válido");
  });

  test("3. data/mc_photos.json possui vínculos e IDs canônicos corretos", () => {
    assert.ok(fs.existsSync(mcPhotosJsonPath), "data/mc_photos.json deve existir");
    const raw = fs.readFileSync(mcPhotosJsonPath, "utf-8");
    const mcPhotos = JSON.parse(raw);

    const g25 = mcPhotos.find((p) => p.management_code === "2026.2");
    assert.ok(g25, "Gestão 2026.2 deve existir no JSON");
    assert.equal(g25.member_name, "Rafael Inácio do Nascimento de Morais", "MC da Gestão XXV deve ser Rafael Inácio");
    assert.equal(g25.member_id_demolay, "143845", "ID DeMolay da Gestão XXV deve ser 143845");
    assert.equal(g25.status, "Atual", "Status da Gestão XXV deve ser Atual");
    assert.equal(g25.photo_url, "/gestoes/rafael-inacio.2026.2.jpg", "Foto da Gestão XXV deve ser rafael-inacio.2026.2.jpg");

    const g26 = mcPhotos.find((p) => p.management_code === "2027.1");
    assert.ok(g26, "Gestão 2027.1 deve existir no JSON");
    assert.equal(g26.member_name, "A definir", "MC da Gestão XXVI deve ser A definir (não presumido)");
    assert.equal(g26.member_id_demolay, null, "ID DeMolay da Gestão XXVI deve ser null");
    assert.equal(g26.status, "Planejada", "Status da Gestão XXVI deve ser Planejada");

    const g24 = mcPhotos.find((p) => p.management_code === "2026.1");
    assert.ok(g24, "Gestão 2026.1 deve existir no JSON");
    assert.equal(g24.member_id_demolay, "127739", "ID DeMolay da Gestão XXIV deve ser 127739");
    assert.equal(g24.member_name, "José Keltton da Silva Cardoso Viana", "MC da Gestão XXIV deve ser José Keltton");

    const g23 = mcPhotos.find((p) => p.management_code === "2025.2");
    assert.ok(g23, "Gestão 2025.2 deve existir no JSON");
    assert.equal(g23.member_id_demolay, "127738", "ID DeMolay da Gestão XXIII deve ser 127738");
    assert.equal(g23.member_name, "João Guilherme Martins Lopes Monteiro", "MC da Gestão XXIII deve ser João Guilherme");
  });

  test("4. Páginas públicas (/ e /gestoes) exibem Rafael Inácio na Gestão XXV e XXVI não presumida", () => {
    const homeContent = fs.readFileSync(homePagePath, "utf-8");
    const gestoesContent = fs.readFileSync(gestoesPagePath, "utf-8");

    // Home Page
    assert.match(homeContent, /"2026\.2":\s*\{\s*photo_url:\s*"\/gestoes\/rafael-inacio\.2026\.2\.jpg",\s*member_name:\s*"Rafael Inácio do Nascimento de Morais"\s*\}/,
      "Home page deve mapear 2026.2 para Rafael Inácio");

    // Galeria de Gestões
    assert.match(gestoesContent, /numero:\s*"XXV",[\s\S]*?mc:\s*"Rafael Inácio do Nascimento de Morais",[\s\S]*?periodo:\s*"2026\.2",[\s\S]*?foto:\s*"\/gestoes\/rafael-inacio\.2026\.2\.jpg"/,
      "Página /gestoes deve ter Gestão XXV com Rafael Inácio e rafael-inacio.2026.2.jpg");
    assert.match(gestoesContent, /numero:\s*"XXVI",[\s\S]*?mc:\s*"A definir",[\s\S]*?periodo:\s*"2027\.1"/,
      "Página /gestoes deve ter Gestão XXVI como A definir");
  });

  test("5. Os 18 registros históricos de atividades possuem MC coerente com a gestão", () => {
    assert.equal(HISTORICAL_MEETINGS.length, 18, "Devem existir exatamente 18 reuniões históricas autênticas");

    // Reuniões 1 a 12 (Gestão XXIV - 2026.1): MC José Keltton
    const g24Meetings = HISTORICAL_MEETINGS.filter((m) => m.management && m.management.includes("XXIV"));
    assert.equal(g24Meetings.length, 12, "Gestão XXIV deve possuir 12 reuniões");
    g24Meetings.forEach((m, idx) => {
      assert.equal(m.mc_name, "José Keltton da Silva Cardoso Viana",
        `Reunião Gestão XXIV #${idx + 1} (${m.starts_at}) deve ter sido conduzida por José Keltton`);
    });

    // Reuniões 13 a 18 (Gestão XXV - 2026.2): MC Rafael Inácio do Nascimento de Morais
    const g25Meetings = HISTORICAL_MEETINGS.filter((m) => m.management && m.management.includes("XXV"));
    assert.equal(g25Meetings.length, 6, "Gestão XXV deve possuir 6 reuniões");
    g25Meetings.forEach((m, idx) => {
      assert.equal(m.mc_name, "Rafael Inácio do Nascimento de Morais",
        `Reunião Gestão XXV #${idx + 1} (${m.starts_at}) deve ter sido conduzida por Rafael Inácio`);
    });

    // Confere arquivo site_publications.json sincronizado
    const rawPubs = fs.readFileSync(sitePubsPath, "utf-8");
    const pubs = JSON.parse(rawPubs);
    const g25Pubs = pubs.filter((p) => p.management && p.management.includes("XXV"));
    assert.ok(g25Pubs.length >= 6, "site_publications deve conter as publicações da Gestão XXV");
    g25Pubs.forEach((p, idx) => {
      assert.equal(p.mc_name, "Rafael Inácio do Nascimento de Morais",
        `Publicação da Gestão XXV #${idx + 1} deve ter mc_name = Rafael Inácio`);
    });
  });

  test("6. Documentos de gestão (historicalGestaoDocs) associam Gestão XXV a Rafael Inácio", () => {
    const docsContent = fs.readFileSync(gestaoDocsPath, "utf-8");
    assert.match(docsContent, /management:\s*"Gestão XXV \(2026\.2\)",\s*mcName:\s*"MC Rafael Inácio do Nascimento de Morais"/,
      "historicalGestaoDocs deve mapear Gestão XXV para MC Rafael Inácio do Nascimento de Morais");
  });
});
