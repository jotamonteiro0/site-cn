import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function collectTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("Resiliência de Autenticação, Navegação, Sessão e Armazenamento Seguro", () => {
  test("1. proxy.ts impede cache de redirecionamentos 307 e limpa cookies sb-* órfãos em sessão inválida", () => {
    const proxyCode = fs.readFileSync(path.join(rootDir, "proxy.ts"), "utf-8");
    assert.ok(
      proxyCode.includes("private, no-store, no-cache, max-age=0, must-revalidate"),
      "Redirecionamentos de autenticação não devem ser cacheados em CDN/navegador",
    );
    assert.ok(
      proxyCode.includes('cookie.name.startsWith("sb-")') && proxyCode.includes("maxAge: 0"),
      "proxy.ts deve expurgar cookies sb-* inválidos para evitar loop infinito com /login",
    );
    assert.ok(
      proxyCode.includes("/login?erro=sessao_expirada"),
      "proxy.ts deve sinalizar sessão expirada ao redirecionar",
    );
  });

  test("2. app/login/page.tsx valida sessão estritamente via getUser() e implementa redefinição de senha (?redefinir=1)", () => {
    const loginCode = fs.readFileSync(path.join(rootDir, "app/login/page.tsx"), "utf-8");
    assert.ok(
      !loginCode.includes("auth.getSession()"),
      "login/page.tsx não deve usar getSession() local não validado para redirecionamento automático",
    );
    assert.ok(
      loginCode.includes("supabase.auth.getUser()"),
      "login/page.tsx deve validar usuário ativo no servidor GoTrue antes de redirecionar",
    );
    assert.ok(
      loginCode.includes("PASSWORD_RECOVERY") && loginCode.includes("handleSaveRecoveredPassword"),
      "login/page.tsx deve tratar recuperação efetiva de senha (?redefinir=1 / PASSWORD_RECOVERY)",
    );
    assert.ok(
      loginCode.includes("supabase.auth.updateUser"),
      "Modal de nova senha deve atualizar a credencial via supabase.auth.updateUser",
    );
  });

  test("3. Fronteira Portal Público -> Login usa navegação documental nativa (<a href='/login'>) imune a falha CORS RSC", () => {
    const headerCode = fs.readFileSync(path.join(rootDir, "components/site/Header.tsx"), "utf-8");
    const homeCode = fs.readFileSync(path.join(rootDir, "app/page.tsx"), "utf-8");
    const footerCode = fs.readFileSync(path.join(rootDir, "components/site/Footer.tsx"), "utf-8");

    assert.ok(!headerCode.includes('<Link\n            href="/login"'), "Header não deve usar soft RSC Link para /login");
    assert.ok(headerCode.includes('href="/login"'), "Header deve manter link documental para /login");
    assert.ok(!homeCode.includes('<Link\n                href="/login"'), "Home não deve usar soft RSC Link para /login");
    assert.ok(!footerCode.includes('<Link href="/login"'), "Footer não deve usar soft RSC Link para /login");
  });

  test("4. Error Boundaries institucionais cobrem raiz e dashboard com estilos resilientes e recuperação de rede", () => {
    const globalErrPath = path.join(rootDir, "app/global-error.tsx");
    const rootErrPath = path.join(rootDir, "app/error.tsx");
    const dashErrPath = path.join(rootDir, "app/(dashboard)/error.tsx");

    assert.ok(fs.existsSync(globalErrPath), "app/global-error.tsx deve existir");
    assert.ok(fs.existsSync(rootErrPath), "app/error.tsx deve existir");
    assert.ok(fs.existsSync(dashErrPath), "app/(dashboard)/error.tsx deve existir");

    const globalCode = fs.readFileSync(globalErrPath, "utf-8");
    assert.ok(globalCode.includes('import "./globals.css"'), "global-error.tsx deve importar globals.css");
    assert.ok(globalCode.includes("window.location.reload()"), "global-error.tsx deve recarregar documento em falha de rede/chunk");
  });

  test("5. Zero chamadas diretas desprotegidas a localStorage em app/ e components/", () => {
    const files = [
      ...collectTsFiles(path.join(rootDir, "app")),
      ...collectTsFiles(path.join(rootDir, "components")),
    ];

    for (const file of files) {
      const code = fs.readFileSync(file, "utf-8");
      const hasRawCall = /\blocalStorage\.(getItem|setItem|removeItem|clear)\b/.test(code);
      assert.equal(
        hasRawCall,
        false,
        `Arquivo ${path.relative(rootDir, file)} não deve chamar localStorage diretamente; use safeStorage`,
      );
    }
  });

  test("6. Proteção de filtro PostgREST em /api/member/profile e RBAC real em /dashboard/conselho", () => {
    const profileRoute = fs.readFileSync(path.join(rootDir, "app/api/member/profile/route.ts"), "utf-8");
    assert.ok(
      profileRoute.includes("buildSafeMemberIdentityFilter"),
      "API de perfil deve construir filtro .or() seguro sem cláusulas vazias",
    );
    assert.ok(
      !profileRoute.includes('id_demolay.eq.${user.user_metadata?.id_demolay || ""}'),
      "API de perfil não deve interpolar id_demolay vazio em .or()",
    );

    const conselhoPage = fs.readFileSync(path.join(rootDir, "app/(dashboard)/dashboard/conselho/page.tsx"), "utf-8");
    assert.ok(
      conselhoPage.includes("supabase.auth.getUser()") && conselhoPage.includes("chapter_memberships"),
      "Módulo do Conselho Consultivo deve validar papel real via Supabase Auth",
    );
  });
});
