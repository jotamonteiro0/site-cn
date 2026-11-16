import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createChunks } from "@supabase/ssr";

const ARTIFACTS_DIR = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log("Gerando sessão oficial de Master (joaomonteiro0@icloud.com)...");
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

console.log("\nIniciando Firefox Headless com WebDriver BiDi na porta 9245...");
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
      } catch {
        // ignora
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
  const outPath = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(outPath, buf);
  console.log(` -> Captura salva: ${filename} (${Math.round(buf.length / 1024)} KB)`);
}

try {
  await send("session.new", { capabilities: {} });
  const tree = await send("browsingContext.getTree");
  const context = tree.contexts[0].context;

  console.log("Injetando credenciais e cookies no navegador...");
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
    localStorage.setItem('cn_audit_master', 'true');
  `);
  await new Promise((r) => setTimeout(r, 800));

  // --------------------------------------------------------------------------
  // SCREENSHOT 1: /dashboard (Visão Geral Master)
  // --------------------------------------------------------------------------
  console.log("\n[1] Capturando /dashboard (Visão Geral Master com os novos 4 cards e carrossel)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 4000));
  await takeScreenshot(context, "audit_32_master_overview_cards_clean.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 2: /dashboard/chamada?tab=calendario (Gerenciamento do Calendário)
  // --------------------------------------------------------------------------
  console.log("\n[2] Capturando /dashboard/chamada?tab=calendario (Gerenciamento do Calendário)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/chamada?tab=calendario",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3500));
  await takeScreenshot(context, "audit_33_calendar_management_entretenimento_filter.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 3: Modal de Reunião com Categoria Entretenimento
  // --------------------------------------------------------------------------
  console.log("\n[3] Abrindo Modal de Cadastro de Reunião com Entretenimento...");
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.textContent && b.textContent.includes('Nova Reunião'));
    if (addBtn) addBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1500));
  await takeScreenshot(context, "audit_34_meeting_modal_entretenimento_active_management.png");

  // Fecha o modal
  await evalScript(context, `
    const closeBtn = document.querySelector('button[type="button"]');
    if (closeBtn) closeBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 500));

  // --------------------------------------------------------------------------
  // SCREENSHOT 4: /dashboard/membro (Autoatendimento Master)
  // --------------------------------------------------------------------------
  console.log("\n[4] Capturando /dashboard/membro (Autoatendimento Master sem duplicidade)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/membro",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(context, "audit_35_master_membro_autoatendimento_clean.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 5: /dashboard/documentos (Atas Capitulares 100% Autênticas)
  // --------------------------------------------------------------------------
  console.log("\n[5] Capturando /dashboard/documentos (Atas Capitulares com horários e MCs corrigidos)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/documentos",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));

  // Clica na aba Atas Capitulares
  await evalScript(context, `
    const tabs = Array.from(document.querySelectorAll('button'));
    const atasTab = tabs.find(b => b.textContent && b.textContent.includes('Atas Capitulares'));
    if (atasTab) atasTab.click();
  `);
  await new Promise((r) => setTimeout(r, 1200));
  await takeScreenshot(context, "audit_36_documentos_atas_audit_20_authentic.png");

  console.log("\nTodas as 5 capturas de tela foram geradas com sucesso no diretório de artefatos!");
} finally {
  try {
    ws.close();
  } catch {}
  try {
    ffProcess.kill("SIGTERM");
  } catch {}
}
