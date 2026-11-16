import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";

const FRAMES_DIR = "/tmp/carousel_frames";
const SCREENSHOTS_DIR = "/home/joaomonteiro/Documents/screenshots-atividades";
const OUTPUT_VIDEO = path.join(SCREENSHOTS_DIR, "carrossel_loop_demonstracao.mp4");

// Prepara diretórios
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

console.log("Iniciando Firefox Headless com WebDriver BiDi...");
const ffProcess = spawn("firefox", [
  "--headless",
  "--window-size", "1440,920",
  "--remote-debugging-port", "9222"
], { stdio: "ignore" });

// Aguarda inicialização do RemoteAgent
await new Promise((r) => setTimeout(r, 2500));

const ws = new WebSocket("ws://127.0.0.1:9222/session");
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

let frameIndex = 0;
async function captureFrame(context, customName = null) {
  const result = await send("browsingContext.captureScreenshot", { context });
  const buffer = Buffer.from(result.data, "base64");
  const filename = customName || `frame_${String(frameIndex++).padStart(5, "0")}.png`;
  const filePath = path.join(FRAMES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

try {
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  console.log("Sessão BiDi conectada. Inicializando...");
  await send("session.new", { capabilities: {} });
  const tree = await send("browsingContext.getTree", {});
  const context = tree.contexts[0].context;

  console.log("Navegando para http://localhost:3000/#atividades...");
  await send("browsingContext.navigate", { context, url: "http://localhost:3000/#atividades", wait: "complete" });

  // Aguarda hidratação e centraliza na seção
  await new Promise((r) => setTimeout(r, 1500));
  await evalScript(context, `(() => {
    const el = document.querySelector("#atividades");
    if (el) {
      window.scrollTo({ top: el.offsetTop - 20, behavior: "instant" });
    }
  })()`);
  await new Promise((r) => setTimeout(r, 600));

  // 1. Captura Estado Inicial: Card 1 (Dezembro/2026)
  console.log("Capturando Estado Inicial: Card 1 visível...");
  const initFrame = await captureFrame(context, "loop_01_card1_inicio.png");
  fs.copyFileSync(initFrame, path.join(SCREENSHOTS_DIR, "loop_01_card1_inicio.png"));

  // Grava alguns frames parados para o início do vídeo
  for (let i = 0; i < 8; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 50));
  }

  // 2. Loop Retrógrado: Clica em "Anterior" a partir do Card 1 -> vai suavemente para Card 18 (Janeiro/2026)!
  console.log("Testando Loop Retrógrado: Card 1 -> Card 18 (Janeiro)...");
  await evalScript(context, `(() => {
    const btn = document.querySelector('#atividades button[aria-label="Atividade anterior"]');
    if (btn) btn.click();
  })()`);

  // Captura a animação suave do loop retrógrado
  for (let i = 0; i < 15; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 40));
  }
  await new Promise((r) => setTimeout(r, 500));
  const card18Frame = await captureFrame(context, "loop_02_transicao_card1_para_card18.png");
  fs.copyFileSync(card18Frame, path.join(SCREENSHOTS_DIR, "loop_02_transicao_card1_para_card18.png"));

  // 3. Continua retrocedendo: Card 18 -> Card 17
  console.log("Retrocedendo mais um passo: Card 18 -> Card 17...");
  await evalScript(context, `(() => {
    const btn = document.querySelector('#atividades button[aria-label="Atividade anterior"]');
    if (btn) btn.click();
  })()`);
  for (let i = 0; i < 12; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 40));
  }
  await new Promise((r) => setTimeout(r, 400));

  // 4. Inverte direção: Clica em "Próxima" duas vezes -> volta para Card 18 e depois Card 1 (Loop Anterógrado)
  console.log("Avançando para Card 18...");
  await evalScript(context, `(() => {
    const btn = document.querySelector('#atividades button[aria-label="Próxima atividade"]');
    if (btn) btn.click();
  })()`);
  for (let i = 0; i < 12; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 40));
  }
  await new Promise((r) => setTimeout(r, 400));

  console.log("Testando Loop Anterógrado: Card 18 -> Card 1 (Dezembro)...");
  await evalScript(context, `(() => {
    const btn = document.querySelector('#atividades button[aria-label="Próxima atividade"]');
    if (btn) btn.click();
  })()`);
  for (let i = 0; i < 15; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 40));
  }
  await new Promise((r) => setTimeout(r, 500));
  const card1LoopFrame = await captureFrame(context, "loop_03_transicao_card18_para_card1.png");
  fs.copyFileSync(card1LoopFrame, path.join(SCREENSHOTS_DIR, "loop_03_transicao_card18_para_card1.png"));

  // 5. Continua avançando: Card 1 -> Card 2 -> Card 3
  console.log("Avançando continuamente pelos próximos cards...");
  for (let step = 0; step < 3; step++) {
    await evalScript(context, `(() => {
      const btn = document.querySelector('#atividades button[aria-label="Próxima atividade"]');
      if (btn) btn.click();
    })()`);
    for (let i = 0; i < 10; i++) {
      await captureFrame(context);
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // 6. Teste de Arraste com Mouse (Mouse Drag)
  console.log("Testando simulação de arrasto com mouse...");
  await evalScript(context, `(() => {
    const track = document.querySelector('#atividades [tabindex="0"]');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const startX = rect.left + 500;
    const startY = rect.top + 200;

    track.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY }));
    for (let delta = 10; delta <= 250; delta += 20) {
      track.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: startX - delta, clientY: startY }));
    }
    track.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: startX - 250, clientY: startY }));
  })()`);
  for (let i = 0; i < 15; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 40));
  }
  await new Promise((r) => setTimeout(r, 500));
  const dragFrame = await captureFrame(context, "loop_04_arrasto_mouse.png");
  fs.copyFileSync(dragFrame, path.join(SCREENSHOTS_DIR, "loop_04_arrasto_mouse.png"));

  // Frames finais de repouso
  for (let i = 0; i < 10; i++) {
    await captureFrame(context);
    await new Promise((r) => setTimeout(r, 50));
  }

  ws.close();
  console.log(`Gravação de quadros concluída: ${frameIndex} frames capturados.`);
} finally {
  ffProcess.kill("SIGTERM");
}

// 7. Compilação do Vídeo MP4 com ffmpeg
console.log("Compilando vídeo MP4 em 24 fps com ffmpeg...");
execSync(
  `ffmpeg -y -framerate 24 -i ${FRAMES_DIR}/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 ${OUTPUT_VIDEO}`,
  { stdio: "inherit" }
);

// Copia também uma versão em WebM para garantia de compatibilidade com todos os navegadores web
const OUTPUT_WEBM = path.join(SCREENSHOTS_DIR, "carrossel_loop_demonstracao.webm");
execSync(
  `ffmpeg -y -i ${OUTPUT_VIDEO} -c:v libvpx-vp9 -b:v 1M -crf 30 ${OUTPUT_WEBM}`,
  { stdio: "inherit" }
);

console.log("Vídeos gerados com sucesso!");
console.log(`- MP4: ${OUTPUT_VIDEO}`);
console.log(`- WebM: ${OUTPUT_WEBM}`);
