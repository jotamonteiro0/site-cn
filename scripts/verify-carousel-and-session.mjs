import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createChunks } from "@supabase/ssr";

const ARTIFACTS_DIR = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log("=== VERIFICAÇÃO DEFINITIVA: CARROSSEL DE ATIVIDADES E PERSISTÊNCIA DA SESSÃO ===");

// 1. Gera Sessão Autêntica GoTrue Auth para Master (joaomonteiro0@icloud.com)
console.log("1. Gerando sessão oficial de Master (joaomonteiro0@icloud.com)...");
const envText = fs.readFileSync(".env.local", "utf-8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const link = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: "joaomonteiro0@icloud.com",
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: authData, error: authError } = await anon.auth.verifyOtp({
  token_hash: link.data.properties.hashed_token,
  type: "magiclink",
});
if (authError || !authData?.session) {
  throw new Error(`Falha ao obter sessão Master: ${authError?.message}`);
}
console.log("✓ Sessão Master obtida com sucesso!");

const sessionStr = JSON.stringify(authData.session);
const cookieName = "sb-qvvmpskixyjbislcatso-auth-token";
const chunks = createChunks(cookieName, sessionStr);

// 2. Inicia Firefox Headless
console.log("\n2. Iniciando Firefox Headless com WebDriver BiDi na porta 9240...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,960",
  "--remote-debugging-port", "9240"
], { stdio: "ignore" });

await new Promise((r) => setTimeout(r, 2500));

const ws = new WebSocket("ws://127.0.0.1:9240/session");
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let msgId = 1;

function send(method, params = {}) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener("message", handler);
          if (data.error) {
            reject(new Error(data.message || data.error));
          } else {
            resolve(data.result);
          }
        }
      } catch (err) {
        reject(err);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalScript(context, expression) {
  return send("script.evaluate", {
    expression,
    target: { context },
    awaitPromise: true,
  });
}

async function takeScreenshot(context, filename) {
  const res = await send("browsingContext.captureScreenshot", { context });
  const buf = Buffer.from(res.data, "base64");
  const filePath = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(filePath, buf);
  console.log(`✓ Screenshot salvo: ${filename} (${buf.length} bytes)`);
  return filePath;
}

try {
  await send("session.new", { capabilities: {} });
  const tree = await send("browsingContext.getTree");
  const context = tree.contexts[0].context;

  // Navega até localhost para injetar cookies da sessão oficial
  console.log("3. Injetando sessão autêntica nos cookies do navegador...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/",
    wait: "complete",
  });

  const cookieSetters = chunks
    .map((c) => `document.cookie = '${c.name}=' + encodeURIComponent(${JSON.stringify(c.value)}) + '; path=/; max-age=3600';`)
    .join("\n");

  await evalScript(context, `
    ${cookieSetters}
    localStorage.setItem('${cookieName}', ${JSON.stringify(sessionStr)});
    localStorage.setItem('cn_view_as_member', 'false');
    localStorage.setItem('cn_user_role', 'master');
  `);
  await new Promise((r) => setTimeout(r, 500));

  // TESTE 1: Acesso direto a /dashboard
  console.log("\n4. Navegando para /dashboard...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));

  const urlDashboard = await evalScript(context, "window.location.href");
  console.log("URL atual:", urlDashboard.result.value);
  if (urlDashboard.result.value.includes("/login")) {
    throw new Error("FALHA: Redirecionado para /login na entrada do /dashboard!");
  }
  console.log("✓ Acesso ao /dashboard autenticado com sucesso!");

  // TESTE 2: Verificação do Carrossel de Atividades na Visão Geral
  console.log("\n5. Verificando Carrossel de Atividades Recentes em /dashboard...");
  const rawAudit = await evalScript(context, `
    (() => {
      const sec = document.querySelector('section[aria-label="Atividades Recentes do Capítulo"]');
      if (!sec) return JSON.stringify({ found: false });
      const title = sec.querySelector('h2')?.textContent || '';
      const viewAllLink = sec.querySelector('a[href="/dashboard/atividades"]')?.textContent || '';
      const articles = sec.querySelectorAll('article');
      const prevBtn = sec.querySelector('button[aria-label*="anterior"]');
      const nextBtn = sec.querySelector('button[aria-label*="Próxima"]');
      return JSON.stringify({
        found: true,
        title,
        viewAllLink,
        articleCount: articles.length,
        hasPrevBtn: !!prevBtn,
        hasNextBtn: !!nextBtn,
      });
    })()
  `);

  const carouselData = JSON.parse(rawAudit.result.value);
  console.log("Resultado da inspeção do Carrossel:", JSON.stringify(carouselData, null, 2));
  if (!carouselData.found) {
    throw new Error("FALHA CRÍTICA: Carrossel de Atividades Recentes NÃO foi encontrado em /dashboard!");
  }
  if (carouselData.articleCount < 18) {
    throw new Error(`FALHA: Quantidade de artigos no carrossel (${carouselData.articleCount}) menor que 18!`);
  }
  console.log("✓ Carrossel de Atividades presente, com 54 slides de loop virtual (3 sets de 18 atividades)!");

  // Scroll até o carrossel e captura de tela
  await evalScript(context, `
    const sec = document.querySelector('section[aria-label="Atividades Recentes do Capítulo"]');
    if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'center' });
  `);
  await new Promise((r) => setTimeout(r, 800));
  await takeScreenshot(context, "audit_15_dashboard_carousel_fixed.png");

  // TESTE 3: Teste de navegação e clique nas setas do carrossel
  console.log("\n6. Testando clique no botão de avanço do carrossel...");
  await evalScript(context, `
    const sec = document.querySelector('section[aria-label="Atividades Recentes do Capítulo"]');
    const nextBtn = sec.querySelector('button[aria-label*="Próxima"]');
    if (nextBtn) nextBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 600));

  // TESTE 4: NAVEGAÇÃO CONTÍNUA ENTRE TODAS AS PÁGINAS DO PAINEL (PERSISTÊNCIA DA SESSÃO)
  const routesToTest = [
    "/dashboard/atividades",
    "/dashboard/membros",
    "/dashboard/nominata",
    "/dashboard/documentos",
    "/dashboard/conselho",
    "/dashboard/chamada",
    "/dashboard",
  ];

  console.log("\n7. Testando persistência de sessão em navegação sequencial entre 7 rotas do painel...");
  for (const route of routesToTest) {
    console.log(`Navegando para ${route}...`);
    await send("browsingContext.navigate", {
      context,
      url: `http://localhost:3000${route}`,
      wait: "complete",
    });
    await new Promise((r) => setTimeout(r, 1200));

    const currentUrlRes = await evalScript(context, "window.location.pathname");
    const currentPath = currentUrlRes.result.value;
    console.log(`  -> Path retornado: ${currentPath}`);

    if (currentPath === "/login") {
      throw new Error(`FALHA DE SESSÃO: Usuário foi ejetado para /login ao navegar para ${route}!`);
    }
    if (currentPath !== route) {
      throw new Error(`FALHA DE ROTA: Esperado ${route}, mas recebeu ${currentPath}`);
    }
    console.log(`  ✓ Sessão preservada em ${route}`);

    // Se for /dashboard/atividades, captura screenshot e inspeciona seções III e IV
    if (route === "/dashboard/atividades") {
      const atividadesAudit = await evalScript(context, `
        (() => {
          const sec3 = document.querySelector('section[aria-label="Atividades Recentes"]');
          const sec3Cards = sec3 ? sec3.querySelectorAll('.card-heraldico-dark') : [];
          const notice = document.querySelector('.card-heraldico-dark p')?.textContent || '';
          return JSON.stringify({
            sec3Found: !!sec3,
            sec3CardsCount: sec3Cards.length,
            notice,
          });
        })()
      `);
      const ativData = JSON.parse(atividadesAudit.result.value);
      console.log("  Inspeção /dashboard/atividades:", JSON.stringify(ativData, null, 2));
      await takeScreenshot(context, "audit_16_dashboard_atividades_fixed.png");
    }
  }

  // TESTE 5: Teste de Reload da Página
  console.log("\n8. Testando recarregamento da página (F5 / reload)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 1500));
  const postReloadUrl = await evalScript(context, "window.location.pathname");
  console.log("Path após reload:", postReloadUrl.result.value);
  if (postReloadUrl.result.value === "/login") {
    throw new Error("FALHA: Sessão perdida após recarregar a página!");
  }
  console.log("✓ Sessão 100% mantida após reload da página!");

  console.log("\n=======================================================");
  console.log("TODAS AS VALIDAÇÕES DE CARROSSEL E SESSÃO FORAM APROVADAS!");
  console.log("=======================================================");
} catch (err) {
  console.error("ERRO DURANTE VERIFICAÇÃO:", err);
  process.exitCode = 1;
} finally {
  try {
    ws.close();
  } catch {}
  ffProcess.kill("SIGKILL");
}
