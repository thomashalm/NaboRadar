/**
 * Bygger den kuraterte sykehuslisten i data/sykehus.json.
 *
 * Et sted kommer bare med når to uavhengige offentlige kilder er enige:
 *   1. Helsenorge lister det som behandlingssted med offentlig tilbud innen fysisk helse
 *      (Helsedirektoratets egen oversikt, samme data som «Velg behandlingssted»).
 *   2. Enhetsregisteret har næringskode 86.101 «Somatiske sykehustjenester» på enheten.
 *
 * Det utelukker psykiatri (86.102), rus, bildediagnostikk og laboratorier (86.910),
 * spesialistpraksis (86.221/86.210) og administrative enheter. Koordinaten hentes fra
 * Kartverkets adresse-API på besøksadressen, ikke fra kildene.
 *
 * Kjør: npx tsx scripts/build-sykehus.ts [--skriv]
 * Uten --skriv vises bare forskjellen mot dagens fil, slik at endringer kan leses før
 * de committes. Steder merket «nedlagt» i fila beholdes, men synkes ikke.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fetchJson } from "../lib/http";
import type { KuratertSykehus, SykehusDatasett } from "../lib/providers/helse/types";

const HELSENORGE = "https://tjenester.helsenorge.no/proxy/velgbehandlingssted/api/v1/Behandlingssteder";
const BRREG = "https://data.brreg.no/enhetsregisteret/api";
const KARTVERKET = "https://ws.geonorge.no/adresser/v1/sok";
const FIL = new URL("../data/sykehus.json", import.meta.url).pathname;

const SOMATISK_SYKEHUS = "86.101";

interface Behandlingssted {
  orgnr: number;
  navn: string;
  besoksAdresse: { gateadresse: string | null; postnr: string | null; poststed: string | null } | null;
  kommune: string | null;
  erPrivat: boolean;
  helseRegioner: string[];
  behandlingstilbud: { navn: string }[];
}

const hent = (url: string) => fetchJson(url, { timeoutMs: 30_000, retries: 2 });

/** Næringskoden ligger på underenheten når stedet er et driftssted, ellers på hovedenheten. */
async function naeringskode(orgnr: number): Promise<string | null> {
  for (const sti of ["underenheter", "enheter"]) {
    try {
      const enhet = (await hent(`${BRREG}/${sti}/${orgnr}`)) as { naeringskode1?: { kode?: string } };
      if (enhet.naeringskode1?.kode) return enhet.naeringskode1.kode;
    } catch {
      // 404 på underenhet er normalt — da er stedet registrert som hovedenhet.
    }
  }
  return null;
}

async function geokod(gateadresse: string, postnr: string): Promise<[number, number] | null> {
  const url = `${KARTVERKET}?sok=${encodeURIComponent(gateadresse)}&postnummer=${postnr}&treffPerSide=1`;
  const svar = (await hent(url)) as { adresser?: { representasjonspunkt: { lat: number; lon: number } }[] };
  const punkt = svar.adresser?.[0]?.representasjonspunkt;
  return punkt ? [punkt.lon, punkt.lat] : null;
}

/**
 * Noen navn kommer i store bokstaver fra Enhetsregisteret via Helsenorge. Vi normaliserer
 * bare disse, og lar navn som allerede har blandet skrift stå urørt.
 */
const STORE_ORD = new Set(["HF", "AS", "ASA", "SA", "IKS"]);
const SMÅ_ORD = new Set(["i", "og", "for", "ved", "på", "av", "med", "til"]);
function ryddNavn(navn: string): string {
  if (navn !== navn.toUpperCase()) return navn;
  return navn
    .toLocaleLowerCase("nb")
    .split(" ")
    .map((ord, i) => {
      const rent = ord.toLocaleUpperCase("nb");
      if (STORE_ORD.has(rent)) return rent;
      if (i > 0 && SMÅ_ORD.has(ord)) return ord;
      return ord.charAt(0).toLocaleUpperCase("nb") + ord.slice(1);
    })
    .join(" ");
}

/** Flere Helsenorge-oppføringer kan ligge på samme adresse (egen rad for f.eks. rehabilitering). */
const stedsnokkel = (s: KuratertSykehus) => `${s.lng.toFixed(5)},${s.lat.toFixed(5)}`;

async function main() {
  const skriv = process.argv.includes("--skriv");
  const idag = new Date().toISOString().slice(0, 10);

  const svar = (await hent(HELSENORGE)) as { behandlingssteder: Behandlingssted[] };
  const fysisk = svar.behandlingssteder.filter((b) => b.behandlingstilbud.some((t) => t.navn === "Fysisk helse"));
  console.log(`Helsenorge: ${svar.behandlingssteder.length} behandlingssteder, ${fysisk.length} innen fysisk helse`);

  const steder: KuratertSykehus[] = [];
  const forkastet: string[] = [];

  for (const b of fysisk) {
    const kode = await naeringskode(b.orgnr);
    if (kode !== SOMATISK_SYKEHUS) {
      forkastet.push(`${b.navn} — næringskode ${kode ?? "ukjent"}`);
      continue;
    }
    const adresse = b.besoksAdresse;
    if (!adresse?.gateadresse || !adresse.postnr) {
      forkastet.push(`${b.navn} — mangler besøksadresse`);
      continue;
    }
    const punkt = await geokod(adresse.gateadresse, adresse.postnr);
    if (!punkt) {
      forkastet.push(`${b.navn} — fant ikke adressen hos Kartverket`);
      continue;
    }
    steder.push({
      orgnr: String(b.orgnr),
      navn: ryddNavn(b.navn),
      adresse: adresse.gateadresse,
      postnr: adresse.postnr,
      poststed: adresse.poststed ?? null,
      kommune: b.kommune,
      lng: punkt[0],
      lat: punkt[1],
      eierform: b.erPrivat ? "privat" : "offentlig",
      helseregion: b.helseRegioner[0] ?? null,
      naeringskode: SOMATISK_SYKEHUS,
      status: "i drift",
      verifisert: idag,
    });
  }

  // Samme bygg, flere oppføringer: behold den korteste betegnelsen, som er selve sykehuset.
  const perSted = new Map<string, KuratertSykehus>();
  for (const sted of steder.sort((a, b) => a.navn.length - b.navn.length)) {
    const nokkel = stedsnokkel(sted);
    if (!perSted.has(nokkel)) perSted.set(nokkel, sted);
    else forkastet.push(`${sted.navn} — samme adresse som ${perSted.get(nokkel)!.navn}`);
  }

  const gammel: SykehusDatasett = JSON.parse(readFileSync(FIL, "utf8"));
  const nedlagte = gammel.steder.filter((s) => s.status === "nedlagt");
  const nye = [...perSted.values(), ...nedlagte].sort((a, b) => a.navn.localeCompare(b.navn, "nb"));

  const før = new Set(gammel.steder.map((s) => s.orgnr));
  const etter = new Set(nye.map((s) => s.orgnr));
  console.log(`\n${nye.length} sykehus (${forkastet.length} oppføringer forkastet)`);
  for (const s of nye.filter((s) => !før.has(s.orgnr))) console.log(`  + ${s.navn} (${s.kommune})`);
  for (const s of gammel.steder.filter((s) => !etter.has(s.orgnr))) console.log(`  − ${s.navn} — borte fra kilden`);

  if (!skriv) {
    console.log("\nKjør med --skriv for å oppdatere data/sykehus.json.");
    return;
  }
  const datasett: SykehusDatasett = {
    verifisert: idag,
    kilder: [
      { navn: "Helsenorge – behandlingssteder med offentlig tilbud", url: HELSENORGE },
      { navn: "Enhetsregisteret – næringskode 86.101", url: `${BRREG}/underenheter` },
      { navn: "Kartverket – adresse-API (koordinat)", url: KARTVERKET },
    ],
    steder: nye,
  };
  writeFileSync(FIL, `${JSON.stringify(datasett, null, 2)}\n`);
  console.log(`\nSkrev ${FIL}`);
}

void main();
