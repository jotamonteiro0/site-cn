import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const targetDir = "/home/joaomonteiro/.gemini/antigravity-cli/brain/8bc78c9e-0c31-4aae-b0cb-1e6be638c903/screenshots";
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("1. Capturing Production Homepage...");
  await page.goto("https://site-cn-mu.vercel.app/", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: path.join(targetDir, "audit_final_01_prod_homepage_xxv.png"), fullPage: false });

  console.log("2. Capturing Production Gestões...");
  await page.goto("https://site-cn-mu.vercel.app/gestoes", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: path.join(targetDir, "audit_final_02_prod_gestoes_13_photos.png"), fullPage: false });

  console.log("3. Capturing Local Dashboard Membro (Autoatendimento sem reuniões)...");
  await page.goto("http://localhost:3000/dashboard/membro", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: path.join(targetDir, "audit_final_03_membro_autoatendimento_clean.png"), fullPage: false });

  console.log("4. Capturing Local Dashboard Atividades (Calendário Oficial)...");
  await page.goto("http://localhost:3000/dashboard/atividades", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: path.join(targetDir, "audit_final_04_calendario_oficial_atividades.png"), fullPage: false });

  console.log("5. Capturing Local Dashboard Publicações CMS...");
  await page.goto("http://localhost:3000/dashboard/publicacoes", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: path.join(targetDir, "audit_final_05_cms_publicacoes_18_authentic.png"), fullPage: false });

  console.log("6. Capturing Local Dashboard Overview (Cards Maioridades e Pendências)...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: path.join(targetDir, "audit_final_06_master_overview_cards.png"), fullPage: false });

  await browser.close();
  console.log("All audit screenshots captured successfully!");
}

run().catch(console.error);
