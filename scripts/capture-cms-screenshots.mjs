import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ARTIFACTS_DIR = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log("Iniciando Firefox Headless com WebDriver BiDi...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,920",
  "--remote-debugging-port", "9224"
], { stdio: "ignore" });

await new Promise((r) => setTimeout(r, 2500));

const ws = new WebSocket("ws://127.0.0.1:9224/session");
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
  console.log(`Screenshot salvo: ${filename}`);
  return filePath;
}

try {
  await send("session.new", { capabilities: {} });
  const tree = await send("browsingContext.getTree");
  const context = tree.contexts[0].context;

  // Mock de sessão Master no LocalStorage e Cookie para visualização completa
  console.log("Navegando para /dashboard/publicacoes...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/publicacoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Injeta usuário Master autenticado no mock de estado
  await evalScript(context, `
    localStorage.setItem("cn_view_as_member", "false");
    window.location.reload();
  `);
  await new Promise((r) => setTimeout(r, 2000));

  // Screenshot 1: Lista de Publicações
  await takeScreenshot(context, "cms_01_publicacoes_lista.png");

  // Abre Modal "Nova Publicação"
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const newBtn = btns.find(b => b.textContent && b.textContent.includes('Nova Publicação'));
    if (newBtn) newBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 800));

  // Screenshot 2: Modal Nova Publicação (Formulário)
  await takeScreenshot(context, "cms_02_modal_nova_publicacao.png");

  // Alterna para aba Pré-visualização do Card
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const prevBtn = btns.find(b => b.textContent && b.textContent.includes('Pré-visualização'));
    if (prevBtn) prevBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 800));

  // Screenshot 3: Modal Live Preview
  await takeScreenshot(context, "cms_03_modal_live_preview.png");

  // Fecha Modal
  await evalScript(context, `
    const closeBtn = document.querySelector('button[aria-label="Fechar modal"]');
    if (closeBtn) closeBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 500));

  // Alterna para Aba "Fotografias dos Mestres Conselheiros"
  await evalScript(context, `
    const tabs = Array.from(document.querySelectorAll('button'));
    const photoTab = tabs.find(b => b.textContent && b.textContent.includes('Fotografias dos Mestres Conselheiros'));
    if (photoTab) photoTab.click();
  `);
  await new Promise((r) => setTimeout(r, 1000));

  // Screenshot 4: Aba de Fotografias de MCs
  await takeScreenshot(context, "cms_04_tab_fotografias_mc.png");

  // Screenshot 5: Site público - Seção Atividades Realizadas com Carrossel em Loop
  console.log("Navegando para o site público /#atividades...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/#atividades",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 1500));

  await evalScript(context, `
    const el = document.getElementById('atividades');
    if (el) el.scrollIntoView({ behavior: 'auto' });
  `);
  await new Promise((r) => setTimeout(r, 1000));

  await takeScreenshot(context, "cms_05_public_carrossel.png");

  // Screenshot 6: Galeria Completa de Gestões (/gestoes)
  console.log("Navegando para /gestoes...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/gestoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 1500));
  await takeScreenshot(context, "cms_06_galeria_gestoes.png");

  console.log("Capturas concluídas com sucesso!");
} catch (err) {
  console.error("Erro na captura de screenshots:", err);
} finally {
  try {
    ws.close();
  } catch {}
  ffProcess.kill("SIGKILL");
}
