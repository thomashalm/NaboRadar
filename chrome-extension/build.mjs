// Bygger utvidelsen til chrome-extension/dist — mappen som lastes inn i Chrome («Load unpacked»).
// NABORADAR_BASE_URL=http://localhost:3100 npm run ext:build  → peker mot lokal NaboRadar.
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dist = `${root}dist`;
const baseUrl = new URL(process.env.NABORADAR_BASE_URL ?? "https://naboradar.no").origin;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: { content: `${root}src/content.ts`, popup: `${root}src/popup.ts` },
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome120",
  define: { NABORADAR_BASE_URL: JSON.stringify(baseUrl) },
  logLevel: "info",
});

for (const file of ["popup.html", "popup.css"]) await cp(`${root}src/${file}`, `${dist}/${file}`);
await cp(`${root}manifest.json`, `${dist}/manifest.json`);

console.log(`Utvidelsen er bygget til ${dist} (NaboRadar: ${baseUrl})`);
