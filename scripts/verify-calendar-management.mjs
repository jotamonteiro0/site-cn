import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createChunks } from "@supabase/ssr";

const ARTIFACTS_DIR = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log("=== HOMOLOGAÇÃO VISUAL: GERENCIAMENTO ADMINISTRATIVO DO CALENDÁRIO ===");

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
console.log("\n2. Iniciando Firefox Headless com WebDriver BiDi na porta 9245...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,1050",
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

  // Injeta sessão
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
  await new Promise((r) => setTimeout(r, 600));

  // TESTE 1: /dashboard/chamada?tab=calendario (Master View - Grade Mensal)
  console.log("\n4. Navegando para /dashboard/chamada?tab=calendario como Master...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/chamada?tab=calendario",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  // Descarta banner LGPD e scroll para a seção do calendário
  await evalScript(context, `
    const lgpdBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Entendido'));
    if (lgpdBtn) lgpdBtn.click();
    window.scrollBy({ top: 350, behavior: 'instant' });
  `);
  await new Promise((r) => setTimeout(r, 500));

  await takeScreenshot(context, "audit_20_admin_calendar_management_grid.png");

  // TESTE 2: Modal de Criação / Edição de Reunião
  console.log("\n5. Abrindo modal de cadastro (+ Nova Reunião)...");
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const newBtn = btns.find(b => b.textContent && b.textContent.includes('Nova Reunião'));
    if (newBtn) newBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1000));

  await takeScreenshot(context, "audit_21_admin_calendar_event_modal.png");

  // Fecha o modal
  await evalScript(context, `
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancelar'));
    if (cancelBtn) cancelBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 500));

  // TESTE 3: Modo Leitura (Membro)
  console.log("\n6. Alternando para modo 'Ver como Membro'...");
  await evalScript(context, `
    localStorage.setItem('cn_view_as_member', 'true');
    window.dispatchEvent(new Event('cn_view_as_member_change'));
  `);
  await new Promise((r) => setTimeout(r, 500));
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/chamada?tab=calendario",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `window.scrollBy({ top: 350, behavior: 'instant' });`);
  await new Promise((r) => setTimeout(r, 500));

  await takeScreenshot(context, "audit_22_member_calendar_view_readonly.png");

  // TESTE 4: /dashboard - Verificar botão Gerenciar Agenda na Próxima Sessão (Master)
  console.log("\n7. Retornando ao modo Master e navegando para /dashboard...");
  await evalScript(context, `
    localStorage.setItem('cn_view_as_member', 'false');
    window.dispatchEvent(new Event('cn_view_as_member_change'));
  `);
  await new Promise((r) => setTimeout(r, 500));
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));

  await takeScreenshot(context, "audit_23_dashboard_next_meeting_calendar_link.png");

  // TESTE 5: /dashboard/atividades - Verificar botão Gerenciar Calendário na Seção II
  console.log("\n8. Navegando para /dashboard/atividades...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/atividades",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `
    const sec2 = document.querySelector('section[aria-label="Calendário da Gestão"]');
    if (sec2) sec2.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollBy({ top: 600, behavior: 'instant' });
  `);
  await new Promise((r) => setTimeout(r, 500));

  await takeScreenshot(context, "audit_24_atividades_calendar_management_link.png");

  // TESTE 6: /dashboard/chamada?tab=calendario (Visualização Lista Cronológica)
  console.log("\n9. Navegando para /dashboard/chamada?tab=calendario e alternando para Lista Cronológica...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/chamada?tab=calendario",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `
    const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Lista Cronológica'));
    if (listBtn) listBtn.click();
    window.scrollBy({ top: 650, behavior: 'instant' });
  `);
  await new Promise((r) => setTimeout(r, 800));

  await takeScreenshot(context, "audit_25_admin_calendar_management_list.png");

  // TESTE 7: Abrir Modal de Detalhes da Reunião
  console.log("\n10. Clicando em 'Ver Detalhes' para abrir modal de detalhes...");
  await evalScript(context, `
    const detailBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Ver Detalhes'));
    if (detailBtn) detailBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 800));

  await takeScreenshot(context, "audit_26_calendar_meeting_details_modal.png");

  console.log("\n=== HOMOLOGAÇÃO VISUAL CONCLUÍDA COM SUCESSO! ===");
} catch (err) {
  console.error("Erro na verificação visual:", err);
} finally {
  ws.close();
  ffProcess.kill("SIGKILL");
}
