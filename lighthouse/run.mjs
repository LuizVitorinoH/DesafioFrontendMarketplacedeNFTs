import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { setTimeout as esperar } from "node:timers/promises";

const require = createRequire(import.meta.url);
const lighthouse = (await import("lighthouse")).default;
const chromeLauncher = require("chrome-launcher");

const origem = "http://127.0.0.1:4173";
const paginas = [
  { id: "inicio", url: `${origem}/` },
  { id: "detalhe", url: `${origem}/nfts/ape-01` },
];
const formas = ["mobile", "desktop"];
const corridas = 3;
const pasta = new URL("./reports/", import.meta.url);

const desktop = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
  },
};

function mediana(valores) {
  const ordenado = [...valores].sort((a, b) => a - b);
  return ordenado[Math.floor(ordenado.length / 2)];
}

async function previewNoAr() {
  try {
    const resposta = await fetch(origem);
    return resposta.ok;
  } catch {
    return false;
  }
}

async function subirPreview() {
  if (await previewNoAr()) return null;
  const filho = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
    stdio: "ignore",
    shell: true,
  });
  for (let i = 0; i < 40; i += 1) {
    if (await previewNoAr()) return filho;
    await esperar(500);
  }
  filho.kill();
  throw new Error("O preview não subiu em 4173. Rode npm run build antes.");
}

function auditar(url, porta, forma) {
  return lighthouse(url, {
    port: porta,
    output: ["html", "json"],
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  }, forma === "desktop" ? desktop : undefined);
}

const preview = await subirPreview();
await mkdir(pasta, { recursive: true });
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const resumo = [];

try {
  for (const pagina of paginas) {
    for (const forma of formas) {
      const amostras = [];
      let tentativas = 0;
      for (let corrida = 1; corrida <= corridas && tentativas < corridas + 2; corrida += 1) {
        tentativas += 1;
        const resultado = await auditar(pagina.url, chrome.port, forma);
        const lhr = resultado.lhr;
        const nota = (id) => lhr.categories[id]?.score;
        if (lhr.runtimeError || nota("performance") == null || lhr.audits["largest-contentful-paint"].numericValue == null) {
          corrida -= 1;
          continue;
        }
        const amostra = {
          performance: Math.round(nota("performance") * 100),
          accessibility: Math.round(nota("accessibility") * 100),
          bestPractices: Math.round(nota("best-practices") * 100),
          seo: Math.round(nota("seo") * 100),
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
        };
        amostras.push(amostra);
        const base = `${pagina.id}-${forma}-${corrida}`;
        await writeFile(new URL(`${base}.json`, pasta), resultado.report[1]);
        await writeFile(new URL(`${base}.html`, pasta), resultado.report[0]);
      }
      resumo.push({
        pagina: pagina.id,
        forma,
        performance: mediana(amostras.map((item) => item.performance)),
        accessibility: mediana(amostras.map((item) => item.accessibility)),
        bestPractices: mediana(amostras.map((item) => item.bestPractices)),
        seo: mediana(amostras.map((item) => item.seo)),
        lcp: mediana(amostras.map((item) => item.lcp)),
        cls: mediana(amostras.map((item) => item.cls)),
        tbt: mediana(amostras.map((item) => item.tbt)),
        amostras,
      });
    }
  }
} finally {
  await chrome.kill();
  preview?.kill();
}

const pacote = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const saida = {
  geradoEm: new Date().toISOString(),
  ambiente: `${process.platform} ${process.arch} node ${process.version}`,
  lighthouse: pacote.devDependencies.lighthouse,
  metas: { performance: 90, accessibility: 95, bestPractices: 95, seo: 90 },
  resumo,
};

await writeFile(new URL("./mediana.json", import.meta.url), JSON.stringify(saida, null, 2));
console.log(JSON.stringify(resumo, null, 2));
