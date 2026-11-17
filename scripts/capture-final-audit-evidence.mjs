import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createChunks } from "@supabase/ssr";

const ARTIFACTS_DIR = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

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
console.log("Sessão Master obtida com sucesso!");

const sessionStr = JSON.stringify(authData.session);
const cookieName = "sb-qvvmpskixyjbislcatso-auth-token";
const chunks = createChunks(cookieName, sessionStr);

console.log("\n2. Iniciando servidor Next.js em segundo plano na porta 3000...");
const nextProcess = spawn("npx", ["next", "start", "-p", "3000"], {
  stdio: "inherit",
});

// Aguarda o servidor Next responder
let serverReady = false;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch("http://localhost:3000/");
    if (res.ok || res.status === 200 || res.status === 307 || res.status === 308) {
      serverReady = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
if (!serverReady) {
  nextProcess.kill();
  throw new Error("Servidor Next.js não inicializou na porta 3000!");
}
console.log("Servidor Next.js ativo na porta 3000!");

console.log("\n3. Iniciando Firefox Headless com WebDriver BiDi na porta 9245...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,960",
  "--remote-debugging-port", "9245"
], { stdio: "ignore" });

await new Promise((r) => setTimeout(r, 2500));

const ws = new WebSocket("ws://127.0.0.1:9245/session");
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
      } catch {}
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
  const outPath = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(outPath, buf);
  console.log(` -> Captura salva: ${filename} (${Math.round(buf.length / 1024)} KB)`);
}

try {
  await send("session.new", { capabilities: {} });
  const tree = await send("browsingContext.getTree");
  const context = tree.contexts[0].context;

  // 1. /gestoes (Página Pública de Galeria de Gestões com fotos dos MCs)
  console.log("\n[1] Capturando /gestoes (Galeria de Mestres Conselheiros com todas as fotos)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/gestoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3000));
  await takeScreenshot(context, "audit_43_gestoes_publica_all_past_mcs.png");

  // Injetar credenciais Master
  console.log("\nInjetando credenciais e cookies de Master no navegador...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/",
    wait: "complete",
  });
  const cookieSetters = chunks
    .map((c) => `document.cookie = '${c.name}=' + ${JSON.stringify(c.value)} + '; path=/; max-age=3600';`)
    .join("\n");
  await evalScript(context, `
    ${cookieSetters}
    document.cookie = 'cn_audit_master=true; path=/; max-age=3600';
    localStorage.setItem('${cookieName}', ${JSON.stringify(sessionStr)});
    localStorage.setItem('cn_view_as_member', 'false');
    localStorage.setItem('cn_user_role', 'master');
  `);
  await new Promise((r) => setTimeout(r, 800));

  // 2. /dashboard (Visão Geral Master: Próxima Sessão, Frequência, Zero Badges)
  console.log("\n[2] Capturando /dashboard (Visão Geral Master: Próxima Sessão, Frequência, Zero Badges)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_44_dashboard_overview_clean.png");

  // 3. /dashboard/tesouraria (Tesouraria: Contagem segregada Censo 35, Conselho 18, Total 117)
  console.log("\n[3] Capturando /dashboard/tesouraria (Censo Institucional Segregado)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/tesouraria",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_45_tesouraria_segregated_counts.png");

  // 4. /dashboard/membro?tab=mensalidades (Acesso Membro: cobranças, checkboxes, lote)
  console.log("\n[4] Capturando /dashboard/membro?tab=mensalidades (Mensalidades e Pagamento em Lote)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/membro?tab=mensalidades",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_46_membro_charges_demolay.png");

  // 5. /dashboard/conselho (Conselho: 4 Lojas sem dourado permanente e sem Quadro Geral 27)
  console.log("\n[5] Capturando /dashboard/conselho (4 Lojas Patrocinadoras sem Quadro Geral 27)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/conselho",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_47_conselho_4_lojas_clean.png");

  // 6. /dashboard/nominata (Nominata: Cerimônia de Instalação e Posse dos Oficiais sem truncamento)
  console.log("\n[6] Capturando /dashboard/nominata (Cerimônia de Instalação e Posse dos Oficiais)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/nominata",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_48_nominata_instalacao_posse.png");

  // 7. /dashboard/publicacoes (Publicações: Sugestão de Legenda)
  console.log("\n[7] Capturando /dashboard/publicacoes (CMS Publicações e Sugestão de Legenda)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/publicacoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_49_publicacoes_sugestao_legenda.png");

  // 8. /dashboard/atividades (Atividades: Carrossel contínuo)
  console.log("\n[8] Capturando /dashboard/atividades (Carrossel Contínuo de Atividades)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/atividades",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_50_atividades_loop_carrossel.png");

  // 9. /dashboard/perfil (Perfil SISDM: 11 seções com campos imutáveis)
  console.log("\n[9] Capturando /dashboard/perfil (Perfil SISDM com 11 seções)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/perfil",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_51_perfil_sisdm_11_secoes.png");

  console.log("\nTodas as 9 capturas foram concluídas com sucesso!");
} catch (err) {
  console.error("Erro durante as capturas:", err);
} finally {
  try {
    ws.close();
  } catch {}
  try {
    ffProcess.kill();
  } catch {}
  try {
    nextProcess.kill();
  } catch {}
}
