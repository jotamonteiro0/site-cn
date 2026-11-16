import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Carrega .env.local para garantir credenciais de teste do Supabase
const envLocalPath = path.join(rootDir, ".env.local");
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

describe("Auditoria Rigorosa de Persistência PostgreSQL — Ausência de Fallback para JSON", () => {
  const publicationsJsonPath = path.join(rootDir, "data/site_publications.json");
  const mcPhotosJsonPath = path.join(rootDir, "data/mc_photos.json");
  const pubRepoPath = path.join(rootDir, "lib/repositories/publications-repository.ts");
  const mcRepoPath = path.join(rootDir, "lib/repositories/mc-photos-repository.ts");
  const activitiesRoutePath = path.join(rootDir, "app/api/activities/route.ts");

  let initialPubHash;
  let initialMCHash;
  let initialPubContent;
  let initialMCContent;

  before(() => {
    assert.ok(fs.existsSync(publicationsJsonPath), "Arquivo data/site_publications.json deve existir");
    assert.ok(fs.existsSync(mcPhotosJsonPath), "Arquivo data/mc_photos.json deve existir");

    initialPubHash = getFileHash(publicationsJsonPath);
    initialMCHash = getFileHash(mcPhotosJsonPath);
    initialPubContent = fs.readFileSync(publicationsJsonPath, "utf-8");
    initialMCContent = fs.readFileSync(mcPhotosJsonPath, "utf-8");
  });

  beforeEach(() => {
    // Garante que o estado dos arquivos em disco permanece intocado
    assert.equal(getFileHash(publicationsJsonPath), initialPubHash, "Hash de site_publications.json foi alterado");
    assert.equal(getFileHash(mcPhotosJsonPath), initialMCHash, "Hash de mc_photos.json foi alterado");
  });

  // =========================================================================
  // 1. INSPEÇÃO ESTÁTICA: AUSÊNCIA DE ESCRITA OU LEITURA OPERACIONAL EM JSON
  // =========================================================================
  describe("1. Inspeção de Código: Eliminação Total de Fallback Operacional para JSON", () => {
    test("1.1 PublicationsRepository não contém chamadas operacionais a readLocalData ou writeLocalData", () => {
      const code = fs.readFileSync(pubRepoPath, "utf-8");
      assert.ok(
        !code.includes("writeLocalData"),
        "PublicationsRepository não deve conter nenhuma função ou chamada a writeLocalData"
      );
      assert.ok(
        !code.includes("readLocalData"),
        "PublicationsRepository não deve conter nenhuma função ou chamada a readLocalData"
      );
    });

    test("1.2 MCPhotosRepository não contém chamadas operacionais a readLocalData ou writeLocalData", () => {
      const code = fs.readFileSync(mcRepoPath, "utf-8");
      assert.ok(
        !code.includes("writeLocalData"),
        "MCPhotosRepository não deve conter nenhuma função ou chamada a writeLocalData"
      );
      assert.ok(
        !code.includes("readLocalData"),
        "MCPhotosRepository não deve conter nenhuma função ou chamada a readLocalData"
      );
    });

    test("1.3 app/api/activities/route.ts não faz fallback para JSON ou mock quando banco falha", () => {
      const code = fs.readFileSync(activitiesRoutePath, "utf-8");
      assert.ok(
        !code.includes("canonical.slice"),
        "API não deve fatiar ou retornar dados canônicos em caso de falha do banco"
      );
      assert.ok(
        code.includes("status: 500"),
        "API deve propagar status 500 com erro técnico quando PostgreSQL falha"
      );
    });
  });

  // =========================================================================
  // 2. TESTES DE PERSISTÊNCIA EXCLUSIVA NO POSTGRESQL E ZERO GRAVAÇÃO EM JSON
  // =========================================================================
  describe("2. Testes de Escrita: Gravação Exclusiva no PostgreSQL e Zero Modificação em JSON", () => {
    test("2.1 createPublication grava no PostgreSQL e NÃO toca em data/site_publications.json", async () => {
      const { publicationsRepo } = await import("../lib/repositories/publications-repository.ts");

      const testId = `audit-test-create-${Date.now()}`;
      const created = await publicationsRepo.create({
        id: testId,
        title: "Atividade Teste Criação PostgreSQL",
        description: "Validação de gravação exclusiva no banco de dados",
        starts_at: new Date().toISOString(),
        status: "rascunho",
      });

      assert.ok(created, "Deve retornar a publicação gravada no PostgreSQL");
      assert.equal(created.id, testId);

      // Comprovação estrita: o arquivo JSON não foi tocado
      const currentPubHash = getFileHash(publicationsJsonPath);
      assert.equal(currentPubHash, initialPubHash, "data/site_publications.json NÃO PODE SER MODIFICADO");
      const currentContent = fs.readFileSync(publicationsJsonPath, "utf-8");
      assert.equal(currentContent, initialPubContent, "Conteúdo de site_publications.json deve ser idêntico");

      // Limpeza segura no PostgreSQL
      await publicationsRepo.delete(testId);
      assert.equal(getFileHash(publicationsJsonPath), initialPubHash, "data/site_publications.json permaneceu intocado");
    });

    test("2.2 updatePublication atualiza no PostgreSQL e não altera JSON", async () => {
      const { publicationsRepo } = await import("../lib/repositories/publications-repository.ts");

      // Atualiza com dados idênticos a publicação existente
      const updated = await publicationsRepo.update("00000000-0000-0000-0001-202612130000", {
        location: "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
      });

      assert.ok(updated, "Deve atualizar com sucesso no PostgreSQL");
      const currentPubHash = getFileHash(publicationsJsonPath);
      assert.equal(currentPubHash, initialPubHash, "data/site_publications.json NÃO PODE SER MODIFICADO");
    });

    test("2.3 deletePublication remove no PostgreSQL e NÃO toca em data/site_publications.json", async () => {
      const { publicationsRepo } = await import("../lib/repositories/publications-repository.ts");

      const testId = `audit-test-del-${Date.now()}`;
      await publicationsRepo.create({
        id: testId,
        title: "Atividade Teste Exclusão PostgreSQL",
        description: "Validação de exclusão exclusiva no banco de dados",
        starts_at: new Date().toISOString(),
        status: "rascunho",
      });

      const deleted = await publicationsRepo.delete(testId);
      assert.ok(deleted, "Deve excluir publicação com sucesso do PostgreSQL");

      const currentPubHash = getFileHash(publicationsJsonPath);
      assert.equal(currentPubHash, initialPubHash, "data/site_publications.json permaneceu intocado");
    });

    test("2.4 saveMCPhoto grava no PostgreSQL (public.management_mc_photos) e não altera mc_photos.json", async () => {
      const { mcPhotosRepo } = await import("../lib/repositories/mc-photos-repository.ts");

      const saved = await mcPhotosRepo.save({
        management_code: "2026.2",
        management_roman: "XXV",
        management_title: "Gestão XXV",
        member_id: "ed81f7d4-4c3a-45fa-827c-15be3a9433ac",
        member_id_demolay: "143845",
        member_name: "Rafael Inácio do Nascimento de Morais",
        photo_url: "/gestoes/rafael-inacio.2026.2.jpg",
        status: "Atual",
      });

      assert.ok(saved, "Deve persistir foto oficial no PostgreSQL");
      assert.equal(saved.management_code, "2026.2");

      // Comprovação estrita: mc_photos.json não foi tocado
      const currentMCHash = getFileHash(mcPhotosJsonPath);
      assert.equal(currentMCHash, initialMCHash, "data/mc_photos.json NÃO PODE SER MODIFICADO");
      const currentMCContent = fs.readFileSync(mcPhotosJsonPath, "utf-8");
      assert.equal(currentMCContent, initialMCContent, "Conteúdo de mc_photos.json deve ser idêntico");
    });
  });

  // =========================================================================
  // 3. TESTES DE LEITURA: FONTE OFICIAL EXCLUSIVA POSTGRESQL E ZERO FALLBACK
  // =========================================================================
  describe("3. Testes de Leitura: Consulta Exclusiva ao PostgreSQL com 18 Publicações e 13 Fotos", () => {
    test("3.1 getAllPublications consulta public.site_publications e retorna 18 registros autênticos", async () => {
      const { publicationsRepo } = await import("../lib/repositories/publications-repository.ts");

      const pubs = await publicationsRepo.getAll();
      assert.ok(Array.isArray(pubs), "Deve retornar array de publicações do PostgreSQL");
      assert.equal(pubs.length, 18, "Deve conter exatamente as 18 publicações autênticas no PostgreSQL");
      assert.equal(getFileHash(publicationsJsonPath), initialPubHash, "Leitura não altera arquivo JSON");
    });

    test("3.2 getPublishedPublications consulta public.site_publications com status publicado", async () => {
      const { publicationsRepo } = await import("../lib/repositories/publications-repository.ts");

      const res = await publicationsRepo.getPublished(0, 4);
      assert.ok(res.items && res.items.length > 0, "Deve retornar publicações ativas");
      assert.equal(res.total, 18, "Total de publicações autênticas deve ser 18");
      assert.equal(getFileHash(publicationsJsonPath), initialPubHash, "Consulta não altera JSON");
    });

    test("3.3 getAllMCPhotos consulta public.management_mc_photos e retorna 13 fotos oficiais", async () => {
      const { mcPhotosRepo } = await import("../lib/repositories/mc-photos-repository.ts");

      const photos = await mcPhotosRepo.getAll();
      assert.ok(Array.isArray(photos), "Deve retornar array de fotos do PostgreSQL");
      assert.equal(photos.length, 13, "Deve conter as 13 fotografias oficiais cadastradas no PostgreSQL");
      assert.equal(getFileHash(mcPhotosJsonPath), initialMCHash, "Leitura não altera mc_photos.json");
    });

    test("3.4 Repositórios abortam com erro explícito se credenciais não existirem (zero fallback silencioso)", async () => {
      const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { publicationsRepo } = await import("../lib/repositories/publications-repository.ts");
      let errorThrown = null;
      try {
        await publicationsRepo.getAll();
      } catch (err) {
        errorThrown = err;
      } finally {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
      }

      assert.ok(errorThrown, "Deve abortar quando Supabase Admin não está configurado");
      assert.match(
        errorThrown.message,
        /Supabase Admin client não configurado|fallback/i,
        "Deve expressar a ausência de fallback para JSON"
      );
    });
  });

  // =========================================================================
  // 4. DIAGNÓSTICO DO AMBIENTE LOCAL (POSTGRESQL / SUPABASE)
  // =========================================================================
  describe("4. Diagnóstico de Ambiente: Ausência de PostgreSQL/Supabase Local no Host", () => {
    test("4.1 Persistência declarada como PREPARADO (sem falsa simulação)", () => {
      const migrationFile = path.join(rootDir, "supabase/migrations/20261114000032_create_site_publications.sql");
      assert.ok(fs.existsSync(migrationFile), "Migration local de persistência deve existir");

      const sql = fs.readFileSync(migrationFile, "utf-8");
      assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.site_publications"));
      assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.management_mc_photos"));

      // Os arquivos JSON estáticos permanecem como acervos históricos sem uso operacional
      assert.ok(fs.existsSync(publicationsJsonPath));
      assert.ok(fs.existsSync(mcPhotosJsonPath));
    });
  });
});
