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

console.log("\nIniciando Firefox Headless com WebDriver BiDi na porta 9246...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,1080",
  "--remote-debugging-port", "9246"
], { stdio: "ignore" });

await new Promise((r) => setTimeout(r, 2500));

const ws = new WebSocket("ws://127.0.0.1:9246/session");
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let msgId = 1;

function send(method, params = {}) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    const handler = (evt) => {
      try {
        const data = JSON.parse(evt.data);
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
  const dest = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(dest, buf);
  console.log(`[OK] Screenshot gravado: ${dest} (${buf.length} bytes)`);
}

try {
  console.log("Inicializando sessão BiDi...");
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
  // SCREENSHOT 37: /dashboard/conselho (Conselho Consultivo sem Estrutura e Competências)
  // --------------------------------------------------------------------------
  console.log("\n[37] Capturando /dashboard/conselho (sem 'Estrutura e Competências')...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/conselho",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2500));
  await takeScreenshot(context, "audit_37_conselho_sem_competencias.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 38: /dashboard/documentos (Atas Capitulares com filtros responsivos e MC Rafael Inácio)
  // --------------------------------------------------------------------------
  console.log("\n[38] Capturando /dashboard/documentos (Filtros de Atas Capitulares responsivos)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/documentos",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `
    const tabs = Array.from(document.querySelectorAll('button'));
    const atasTab = tabs.find(b => b.textContent && b.textContent.includes('Atas Capitulares'));
    if (atasTab) atasTab.click();
  `);
  await new Promise((r) => setTimeout(r, 1200));
  await takeScreenshot(context, "audit_38_documentos_atas_filtros_responsivos.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 39: /dashboard/membros (José Airton como Sênior DeMolay e Maçom, sem duplicidade)
  // --------------------------------------------------------------------------
  console.log("\n[39] Capturando /dashboard/membros (José Airton com modal de detalhes aberto)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/membros",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2500));
  // Localiza e clica no card ou botão de José Airton
  await evalScript(context, `
    const searchInput = document.querySelector('input[type="text"], input[placeholder*="Buscar"]');
    if (searchInput) {
      searchInput.value = 'Airton';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await evalScript(context, `
    const cards = Array.from(document.querySelectorAll('div, tr, button'));
    const airtonEl = cards.find(el => el.textContent && el.textContent.includes('José Airton Rodrigues Galdino Júnior'));
    if (airtonEl) {
      const btn = airtonEl.closest('button') || airtonEl.querySelector('button') || airtonEl;
      btn.click();
    }
  `);
  await new Promise((r) => setTimeout(r, 1500));
  await takeScreenshot(context, "audit_39_membros_jose_airton_sem_duplicidade.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 40: /dashboard/membro (Autoatendimento de José Airton com 0 cobranças)
  // --------------------------------------------------------------------------
  console.log("\n[40] Capturando /dashboard/membro (Autoatendimento selecionando José Airton)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/membro",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2500));
  await evalScript(context, `
    const selects = Array.from(document.querySelectorAll('select'));
    const memberSelect = selects.find(s => Array.from(s.options).some(o => o.text.includes('Airton') || o.value.includes('102836')));
    if (memberSelect) {
      const opt = Array.from(memberSelect.options).find(o => o.text.includes('Airton') || o.value.includes('102836'));
      if (opt) {
        memberSelect.value = opt.value;
        memberSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  `);
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(context, "audit_40_membro_autoatendimento_airton_sem_cobranca.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 41: Homepage / (Gestão XXV com Rafael Inácio e XXVI Planejada)
  // --------------------------------------------------------------------------
  console.log("\n[41] Capturando Homepage / (Gestão XXV e XXVI)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 3000));
  await evalScript(context, `
    window.scrollTo({ top: 1200, behavior: 'instant' });
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await takeScreenshot(context, "audit_41_homepage_xxv_rafael_inacio.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 42: /gestoes (Página Pública de Gestões)
  // --------------------------------------------------------------------------
  console.log("\n[42] Capturando /gestoes (Galeria de Gestões com Rafael Inácio na XXV)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/gestoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2500));
  await takeScreenshot(context, "audit_42_gestoes_publica_rafael_inacio.png");

  console.log("\nTodas as novas capturas pós-auditoria foram concluídas com sucesso!");
} finally {
  try {
    ws.close();
  } catch {}
  try {
    ffProcess.kill("SIGTERM");
  } catch {}
}
