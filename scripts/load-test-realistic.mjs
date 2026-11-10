import https from "https";

const TARGET_HOST = process.env.LOAD_TEST_HOST || "site-cn-mu.vercel.app";

const SCENARIOS = [
  { route: "/", name: "Landing Page (HTML+Edge)" },
  { route: "/login", name: "Página de Login (Auth)" },
  { route: "/gestoes", name: "Galeria de MCs (Catálogo)" },
  { route: "/documentos", name: "Acervo Público de Documentos" },
  { route: "/termos", name: "Termos de Uso e LGPD" },
  { route: "/privacidade", name: "Política de Privacidade" },
  { route: "/dashboard", name: "Middleware Auth Guard (Fast-Path)" },
  { route: "/api/documents/Ato_001_2025_06_29_Nomeia_Escrivao_Gestao_XXIII.pdf", name: "API Documento Oficial (PDF CDN)" },
  { route: "/api/documents/Edital_001_2026_11_05_Eleicao_XXVI_Gestao_XXV.pdf", name: "API Edital Recente (PDF CDN)" },
];

function requestUrl(path) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const req = https.request(
      {
        hostname: TARGET_HOST,
        path,
        method: "GET",
        headers: {
          "User-Agent": "Realistic-LoadTester/2.0 (Grafana-k6-Simulated)",
        },
      },
      (res) => {
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
        });
        res.on("end", () => {
          const elapsed = performance.now() - t0;
          resolve({
            path,
            status: res.statusCode,
            elapsed,
            size,
            error: null,
          });
        });
      }
    );

    req.on("error", (err) => {
      const elapsed = performance.now() - t0;
      resolve({
        path,
        status: 0,
        elapsed,
        size: 0,
        error: err.message,
      });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      const elapsed = performance.now() - t0;
      resolve({
        path,
        status: 408,
        elapsed,
        size: 0,
        error: "Timeout (>8000ms)",
      });
    });

    req.end();
  });
}

async function runWorker(tasks) {
  const results = [];
  for (const task of tasks) {
    const res = await requestUrl(task.route);
    results.push({ ...res, name: task.name });
  }
  return results;
}

async function runStage(vuCount, requestsPerVu) {
  console.log(`\n--- Executando Estágio com ${vuCount} VUs concorrentes (${vuCount * requestsPerVu} requisições) ---`);
  const vuTasks = [];
  for (let vu = 0; vu < vuCount; vu++) {
    const tasks = [];
    for (let r = 0; r < requestsPerVu; r++) {
      const scenario = SCENARIOS[(vu + r) % SCENARIOS.length];
      tasks.push(scenario);
    }
    vuTasks.push(runWorker(tasks));
  }

  const t0 = performance.now();
  const allVuResults = await Promise.all(vuTasks);
  const totalDuration = performance.now() - t0;

  const flatResults = allVuResults.flat();
  return { flatResults, totalDuration, vuCount };
}

async function main() {
  console.log(`=====================================================================`);
  console.log(`INICIANDO TESTE DE CARGA REALISTA COM RAMP-UP (VUs PROGRESSIVAS)`);
  console.log(`Alvo Oficial: https://${TARGET_HOST}`);
  console.log(`=====================================================================`);

  const stages = [
    { vus: 3, reqPerVu: 4 },  // 12 reqs (Warm-up)
    { vus: 6, reqPerVu: 6 },  // 36 reqs (Carga Normal)
    { vus: 10, reqPerVu: 6 }, // 60 reqs (Pico de Concorrência)
  ];

  const overallResults = [];
  let totalTestTime = 0;

  for (const stage of stages) {
    const { flatResults, totalDuration } = await runStage(stage.vus, stage.reqPerVu);
    overallResults.push(...flatResults);
    totalTestTime += totalDuration;
  }

  const times = overallResults.map((r) => r.elapsed).sort((a, b) => a - b);
  const statuses = {};
  let failures = 0;

  overallResults.forEach((r) => {
    statuses[r.status] = (statuses[r.status] || 0) + 1;
    if (r.status === 0 || r.status >= 500 || r.status === 408) {
      failures++;
    }
  });

  const p50 = times[Math.floor(times.length * 0.5)];
  const p90 = times[Math.floor(times.length * 0.9)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const max = times[times.length - 1];
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const throughput = (overallResults.length / (totalTestTime / 1000)).toFixed(2);

  console.log(`\n=====================================================================`);
  console.log(`RELATÓRIO FINAL DO TESTE DE CARGA REALISTA (RAMP-UP)`);
  console.log(`=====================================================================`);
  console.log(`Total de Requisições:   ${overallResults.length}`);
  console.log(`Distribuição de Status: ${JSON.stringify(statuses)}`);
  console.log(`Taxa de Falhas:         ${((failures / overallResults.length) * 100).toFixed(2)}% (${failures} falhas)`);
  console.log(`Throughput Médio:       ${throughput} req/s`);
  console.log(`Tempo Médio:            ${avg.toFixed(2)} ms`);
  console.log(`Mediana (P50):          ${p50.toFixed(2)} ms`);
  console.log(`Percentil 90 (P90):     ${p90.toFixed(2)} ms`);
  console.log(`Percentil 95 (P95):     ${p95.toFixed(2)} ms`);
  console.log(`Percentil 99 (P99):     ${p99.toFixed(2)} ms`);
  console.log(`Máximo:                 ${max.toFixed(2)} ms`);
  console.log(`Timeouts:               ${statuses[408] || 0}`);
  console.log(`=====================================================================`);

  // Análise detalhada por Rota
  console.log(`\nDesempenho por Rota / Módulo:`);
  const byPath = {};
  overallResults.forEach((r) => {
    if (!byPath[r.path]) byPath[r.path] = { name: r.name, times: [] };
    byPath[r.path].times.push(r.elapsed);
  });

  for (const [p, val] of Object.entries(byPath)) {
    const routeAvg = val.times.reduce((a, b) => a + b, 0) / val.times.length;
    const routeP95 = val.times.sort((a, b) => a - b)[Math.floor(val.times.length * 0.95)];
    console.log(
      `  • ${val.name.padEnd(35)} | Méd: ${routeAvg.toFixed(1).padStart(6)}ms | P95: ${routeP95.toFixed(1).padStart(6)}ms [${p}]`
    );
  }
  console.log(`=====================================================================\n`);
}

main().catch(console.error);
