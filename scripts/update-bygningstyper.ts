/**
 * Henter «Standard for bygningstype / Matrikkelen» (NS 3457) fra SSB KLASS og skriver
 * `lib/property/bygningstyper.json`. Kjør når SSB publiserer en ny versjon:
 *
 *   npx tsx scripts/update-bygningstyper.ts
 *
 * Navnene skrives nøyaktig som SSB har dem. Ingen egne betegnelser legges til.
 */
import { writeFileSync } from "node:fs";

const KLASS = "https://data.ssb.no/api/klass/v1/classifications/31";

interface KlassCode {
  code: string;
  level: string;
  name: string;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

const dato = new Date().toISOString().slice(0, 10);
const meta = await getJson<{ name: string; lastModified: string; versions: { name: string; validFrom: string }[] }>(KLASS);
const { codes } = await getJson<{ codes: KlassCode[] }>(`${KLASS}/codesAt?date=${dato}`);

const koder = Object.fromEntries(
  codes
    .filter((c) => c.level === "3")
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => [c.code, c.name.trim()]),
);
if (Object.keys(koder).length < 100) throw new Error(`Uventet få koder: ${Object.keys(koder).length}`);

const snapshot = {
  kilde: "SSB KLASS 31 – Standard for bygningstype / Matrikkelen (NS 3457)",
  url: KLASS,
  versjon: meta.versions[0]?.name ?? null,
  gyldigFra: meta.versions[0]?.validFrom ?? null,
  sistEndretHosSsb: meta.lastModified.slice(0, 10),
  hentet: dato,
  koder,
};
writeFileSync("lib/property/bygningstyper.json", `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Skrev ${Object.keys(koder).length} bygningstyper (${snapshot.versjon}, sist endret ${snapshot.sistEndretHosSsb}).`);
