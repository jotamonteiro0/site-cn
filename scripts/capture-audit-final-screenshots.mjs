import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createChunks } from "@supabase/ssr";

const ARTIFACTS_DIR = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// 1. Gera Sessão Autêntica GoTrue Auth para Master
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

// 2. Inicia Firefox Headless
console.log("\nIniciando Firefox Headless com WebDriver BiDi na porta 9235...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,960",
  "--remote-debugging-port", "9235"
], { stdio: "ignore" });

await new Promise((r) => setTimeout(r, 2500));

const ws = new WebSocket("ws://127.0.0.1:9235/session");
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
  console.log(`Screenshot salvo: ${filename} (${buf.length} bytes)`);
  return filePath;
}

try {
  await send("session.new", { capabilities: {} });
  const tree = await send("browsingContext.getTree");
  const context = tree.contexts[0].context;

  // Injeta a sessão oficial no navegador
  console.log("Injetando credenciais e cookies no navegador...");
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
    document.cookie = 'cn_audit_master=true; path=/; max-age=3600';
    localStorage.setItem('${cookieName}', ${JSON.stringify(sessionStr)});
    localStorage.setItem('cn_view_as_member', 'false');
    localStorage.setItem('cn_user_role', 'master');
    localStorage.setItem('cn_audit_master', 'true');
  `);
  await new Promise((r) => setTimeout(r, 600));

  // --------------------------------------------------------------------------
  // SCREENSHOT 1: Publicações - Aba Atividades Realizadas no Tema Escuro
  // --------------------------------------------------------------------------
  console.log("\n[1] Capturando /dashboard/publicacoes (Aba atividades no tema escuro)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/publicacoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(context, "audit_13_publicacoes_atividades_tab_dark.png");

  // Clica na aba Fotografias dos Mestres Conselheiros
  await evalScript(context, `
    const tabs = Array.from(document.querySelectorAll('button'));
    const photoTab = tabs.find(b => b.textContent && b.textContent.includes('Fotografias dos Mestres Conselheiros'));
    if (photoTab) photoTab.click();
  `);
  await new Promise((r) => setTimeout(r, 1200));

  await takeScreenshot(context, "audit_01_publicacoes_fotos_mc_dark.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 2: Cropper de Enquadramento 3:4 em Ação
  // --------------------------------------------------------------------------
  console.log("\n[2] Abrindo Modal do Cropper 3:4...");
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const cropperBtn = btns.find(b => b.textContent && b.textContent.includes('Ajustar Enquadramento'));
    if (cropperBtn) cropperBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1200));

  await takeScreenshot(context, "audit_02_mc_cropper_modal.png");

  // Fecha o Cropper
  await evalScript(context, `
    const cancelBtns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = cancelBtns.find(b => b.textContent && b.textContent.includes('Cancelar'));
    if (cancelBtn) cancelBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 600));

  // --------------------------------------------------------------------------
  // SCREENSHOT 3: Quadro de Membros - Paginação 117 Registros (Página 1)
  // --------------------------------------------------------------------------
  console.log("\n[3] Capturando /dashboard/membros (Página 1 - 117 membros)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/membros",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2500));

  await takeScreenshot(context, "audit_03_membros_paginacao.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 4: Quadro de Membros - Página 2
  // --------------------------------------------------------------------------
  console.log("\n[4] Navegando para Página 2 do Quadro de Membros...");
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const nextBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Próxima');
    if (nextBtn) nextBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1500));

  await takeScreenshot(context, "audit_04_membros_paginacao_pagina2.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 5: Conselho Consultivo - Apenas Liderança PCC e Consultor
  // --------------------------------------------------------------------------
  console.log("\n[5] Capturando /dashboard/conselho...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/conselho",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2200));

  await takeScreenshot(context, "audit_05_conselho_consultivo.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 6: Modal com Link "Ver publicação original"
  // --------------------------------------------------------------------------
  console.log("\n[6] Testando Modal de Publicação com Link Original...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/publicacoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Abre Modal Nova Publicação
  await evalScript(context, `
    const btns = Array.from(document.querySelectorAll('button'));
    const newBtn = btns.find(b => b.textContent && b.textContent.includes('Nova Publicação'));
    if (newBtn) newBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1000));

  // Preenche Título e Link Original
  await evalScript(context, `
    const headlineInput = document.querySelector('input[placeholder*="Ex: Cerimônia"]');
    if (headlineInput) {
      headlineInput.value = "Sessão Especial de Confraternização Capitular";
      headlineInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const linkInput = document.querySelector('input[placeholder*="instagram.com"]');
    if (linkInput) {
      linkInput.value = "https://www.instagram.com/p/DF9A4b0R5_1/";
      linkInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const prevTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pré-visualização'));
    if (prevTabBtn) prevTabBtn.click();
  `);
  await new Promise((r) => setTimeout(r, 1200));

  await takeScreenshot(context, "audit_06_publicacao_original_link.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 7: Home Page - Gestão XXV (MC João Guilherme) & Atividades Limpas
  // --------------------------------------------------------------------------
  console.log("\n[7] Capturando Home Page (Gestão XXV João Guilherme & Atividades)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `window.scrollTo(0, 1400);`);
  await new Promise((r) => setTimeout(r, 1000));
  await takeScreenshot(context, "audit_07_home_gestao_xxv.png");

  // Scroll para Atividades Realizadas
  await evalScript(context, `
    const ativSec = document.getElementById('atividades');
    if (ativSec) ativSec.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo(0, 3600);
  `);
  await new Promise((r) => setTimeout(r, 1200));
  await takeScreenshot(context, "audit_08_home_atividades_clean.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 9: Galeria /gestoes (Gestão XXV João Guilherme)
  // --------------------------------------------------------------------------
  console.log("\n[9] Capturando /gestoes (Gestão XXV João Guilherme)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/gestoes",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `window.scrollTo(0, 300);`);
  await new Promise((r) => setTimeout(r, 800));
  await takeScreenshot(context, "audit_09_gestoes_galeria_xxv.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 10: Novo Módulo Membro /dashboard/atividades
  // --------------------------------------------------------------------------
  console.log("\n[10] Capturando /dashboard/atividades (Módulo Membro)...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/atividades",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(context, "audit_10_dashboard_atividades_membro.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 11: Visão Geral como Membro (/dashboard)
  // --------------------------------------------------------------------------
  console.log("\n[11] Capturando /dashboard no modo Ver como Membro...");
  await evalScript(context, `
    localStorage.setItem('cn_view_as_member', 'true');
    window.dispatchEvent(new Event('storage'));
  `);
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await evalScript(context, `
    localStorage.setItem('cn_view_as_member', 'true');
    window.dispatchEvent(new CustomEvent('cn_view_as_member_change'));
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await takeScreenshot(context, "audit_11_dashboard_membro_overview.png");

  // Scroll até a seção de Atividades Recentes do Capítulo
  console.log("\n[11.1] Capturando Seção Atividades Recentes do Capítulo no Dashboard...");
  await evalScript(context, `
    const carouselSec = document.querySelector('section[aria-label="Atividades Recentes do Capítulo"]');
    if (carouselSec) carouselSec.scrollIntoView({ behavior: 'instant', block: 'center' });
    else window.scrollTo(0, 450);
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await takeScreenshot(context, "audit_14_dashboard_overview_carousel.png");

  // --------------------------------------------------------------------------
  // SCREENSHOT 12: Nominata no modo Membro (Sem Badges Administrativos)
  // --------------------------------------------------------------------------
  console.log("\n[12] Capturando /dashboard/nominata no modo Membro...");
  await send("browsingContext.navigate", {
    context,
    url: "http://localhost:3000/dashboard/nominata",
    wait: "complete",
  });
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(context, "audit_12_dashboard_nominata_member_view.png");

  console.log("\nTodas as capturas de homologação foram concluídas com sucesso!");
} catch (err) {
  console.error("Erro durante captura:", err);
} finally {
  try {
    ws.close();
  } catch {}
  ffProcess.kill("SIGKILL");
}
