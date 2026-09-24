/**
 * Bygger den kuraterte listen over omsorgstilbud i data/omsorgstilbud.json.
 *
 * Regelen: et sted kommer bare med når den ansvarlige aktøren selv publiserer både navnet
 * og den konkrete adressen. Ingen tredjepartskataloger, ingen karttjenester, ingen
 * næringskode-treff uten annen bekreftelse, og ingen adresse som må utledes indirekte.
 *
 * Tre kilder:
 *   1. Oslo kommune, «Sykehjem, helsehus og dagsentre» — kommunens egen søkeindeks, med
 *      navn, adresse og koordinat publisert av kommunen selv.
 *   2. Oslo kommune, «Barnevernsinstitusjoner og -tiltak» — samme indeks.
 *   3. Helsenorge, behandlingssteder med offentlig tilbud innen psykisk helse eller rus og
 *      avhengighet — Helsedirektoratets egen oversikt, publisert for at pasienter skal finne
 *      fram. Koordinat hentes fra Kartverkets adressepunkt.
 *
 * Kjør: npx tsx scripts/build-omsorg.ts [--skriv]
 * Uten --skriv vises bare forskjellen mot dagens fil.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fetchJson } from "../lib/http";
import type { KuratertOmsorgstilbud, OmsorgDatasett, OmsorgType } from "../lib/providers/omsorg/types";

const ALGOLIA = "https://nj4qx1mfj2-dsn.algolia.net/1/indexes/prod_oslo_kommune_no/query";
// Offentlig søkenøkkel, den samme oslo.kommune.no selv sender med i nettleseren. Kun lesing.
const ALGOLIA_KEY = "4ce897d2ad7bca6a9fbcac2888b35801";
const ALGOLIA_APP = "NJ4QX1MFJ2";
const HELSENORGE = "https://tjenester.helsenorge.no/proxy/velgbehandlingssted/api/v1/Behandlingssteder";
const KARTVERKET = "https://ws.geonorge.no/adresser/v1/sok";
const FIL = new URL("../data/omsorgstilbud.json", import.meta.url).pathname;

/**
 * Oppføringer vi ikke tar inn selv om kommunen lister dem: fosterhjem og beredskapshjem er
 * private hjem, og team og avdelinger er kontorer, ikke steder med et tilbud på adressen.
 */
const IKKE_STED = /fosterhjem|beredskapshjem|arenafleksibelt team|\bteam\b/i;
/** «Administrasjonsbygget i …» er ikke institusjonens egen adresse. */
const IKKE_EGEN_ADRESSE = /administrasjonsbygg/i;

interface AlgoliaHit {
  name?: string;
  card_data?: { address?: string };
  map_data?: { coordinates?: { lat: number; lng: number }[] };
  meta?: { parent_name?: string; url?: string; type?: string };
}

/** Søket på listens eget navn gir hele listen; vi beholder bare treff som faktisk hører til den. */
async function algolia(parent: string): Promise<AlgoliaHit[]> {
  const response = await fetch(ALGOLIA, {
    method: "POST",
    headers: {
      "X-Algolia-API-Key": ALGOLIA_KEY,
      "X-Algolia-Application-Id": ALGOLIA_APP,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: parent,
      facetFilters: [["meta.type:entry_article_location"]],
      hitsPerPage: 200,
      attributesToRetrieve: ["name", "card_data", "map_data", "meta"],
    }),
  });
  if (!response.ok) throw new Error(`Algolia ${response.status}`);
  const svar = (await response.json()) as { hits: AlgoliaHit[] };
  return svar.hits.filter((hit) => hit.meta?.parent_name === parent);
}

/** «Løvsetdalen 2, 1188 OSLO» → delene. Uten husnummer er adressen ikke presis nok. */
function splittAdresse(adresse: string): { gate: string; postnr: string; poststed: string } | null {
  const treff = /^(.*\d[^,]*),\s*(\d{4})\s+(.+)$/.exec(adresse.trim());
  return treff ? { gate: treff[1]!.trim(), postnr: treff[2]!, poststed: treff[3]!.trim() } : null;
}

function osloType(parent: string, navn: string): OmsorgType {
  if (parent.startsWith("Barnevern")) return /akutt/i.test(navn) ? "akuttinstitusjon" : "barnevern";
  if (/dagsenter|dagaktivitet/i.test(navn)) return "dagsenter";
  if (/helsehus/i.test(navn)) return "helsehus";
  return "sykehjem";
}

async function geokod(gate: string, postnr: string): Promise<[number, number] | null> {
  const url = `${KARTVERKET}?sok=${encodeURIComponent(gate)}&postnummer=${postnr}&treffPerSide=1`;
  const svar = (await fetchJson(url, { timeoutMs: 30_000, retries: 2 })) as {
    adresser?: { representasjonspunkt: { lat: number; lon: number } }[];
  };
  const punkt = svar.adresser?.[0]?.representasjonspunkt;
  return punkt ? [punkt.lon, punkt.lat] : null;
}

const OSLO_LISTER: Record<string, string> = {
  "Sykehjem, helsehus og dagsentre": "Oslo kommune – sykehjem, helsehus og dagsentre",
  "Barnevernsinstitusjoner og -tiltak": "Oslo kommune – barnevernsinstitusjoner og -tiltak",
};

async function fraOslo(idag: string, forkastet: string[]): Promise<KuratertOmsorgstilbud[]> {
  const hits: AlgoliaHit[] = [];
  for (const liste of Object.keys(OSLO_LISTER)) {
    const treff = await algolia(liste);
    console.log(`Oslo kommune, «${liste}»: ${treff.length} steder publisert med adresse`);
    hits.push(...treff);
  }

  const steder: KuratertOmsorgstilbud[] = [];
  for (const hit of hits) {
    const parent = hit.meta!.parent_name!;
    const navn = hit.name?.trim();
    const adresse = hit.card_data?.address?.trim();
    const punkt = hit.map_data?.coordinates?.[0];
    if (!navn || !adresse || !punkt) {
      forkastet.push(`${navn ?? "uten navn"} — kommunen oppgir ikke adresse eller koordinat`);
      continue;
    }
    if (IKKE_STED.test(navn)) {
      forkastet.push(`${navn} — fosterhjem, beredskapshjem eller team, ikke et sted med tilbud på adressen`);
      continue;
    }
    if (IKKE_EGEN_ADRESSE.test(adresse)) {
      forkastet.push(`${navn} — oppgitt adresse er et administrasjonsbygg, ikke stedet selv`);
      continue;
    }
    const deler = splittAdresse(adresse);
    if (!deler) {
      forkastet.push(`${navn} — adressen «${adresse}» mangler husnummer`);
      continue;
    }

    steder.push({
      id: `oslo-${hit.meta!.url!.replace(/\/$/, "").split("/").pop()}`,
      navn,
      internalType: osloType(parent, navn),
      adresse: deler.gate,
      postnr: deler.postnr,
      poststed: deler.poststed,
      kommune: deler.poststed.toUpperCase().includes("OSLO") ? "Oslo" : null,
      lng: punkt.lng,
      lat: punkt.lat,
      operator: "Oslo kommune",
      status: "i drift",
      kilde: OSLO_LISTER[parent]!,
      kildeUrl: hit.meta!.url!,
      kildeType: "kommune",
      koordinatKilde: "kilde",
      verifisert: idag,
    });
  }
  return steder;
}

interface Behandlingssted {
  orgnr: number;
  navn: string;
  besoksAdresse: { gateadresse: string | null; postnr: string | null; poststed: string | null } | null;
  kommune: string | null;
  behandlingstilbud: { navn: string }[];
}

async function fraHelsenorge(idag: string, forkastet: string[]): Promise<KuratertOmsorgstilbud[]> {
  const svar = (await fetchJson(HELSENORGE, { timeoutMs: 30_000, retries: 2 })) as {
    behandlingssteder: Behandlingssted[];
  };
  const aktuelle = svar.behandlingssteder.filter((b) =>
    b.behandlingstilbud.some((t) => t.navn === "Psykisk helse" || t.navn === "Rus og avhengighet"),
  );
  console.log(`Helsenorge: ${svar.behandlingssteder.length} behandlingssteder, ${aktuelle.length} innen psykisk helse eller rus`);

  const steder: KuratertOmsorgstilbud[] = [];
  for (const b of aktuelle) {
    const adresse = b.besoksAdresse;
    if (!adresse?.gateadresse || !adresse.postnr) {
      forkastet.push(`${b.navn} — Helsenorge oppgir ingen besøksadresse`);
      continue;
    }
    if (!/\d/.test(adresse.gateadresse)) {
      forkastet.push(`${b.navn} — adressen «${adresse.gateadresse}» mangler husnummer`);
      continue;
    }
    const punkt = await geokod(adresse.gateadresse, adresse.postnr);
    if (!punkt) {
      forkastet.push(`${b.navn} — fant ikke adressen hos Kartverket`);
      continue;
    }
    const rus = b.behandlingstilbud.some((t) => t.navn === "Rus og avhengighet");
    steder.push({
      id: `helsenorge-${b.orgnr}`,
      navn: b.navn,
      internalType: rus ? "rusbehandling" : "psykisk_helse",
      adresse: adresse.gateadresse,
      postnr: adresse.postnr,
      poststed: adresse.poststed ?? null,
      kommune: b.kommune,
      lng: punkt[0],
      lat: punkt[1],
      operator: null,
      status: "i drift",
      kilde: "Helsenorge – behandlingssteder med offentlig tilbud",
      kildeUrl: "https://tjenester.helsenorge.no/velg-behandlingssted/behandlingssteder",
      kildeType: "helsemyndighet",
      koordinatKilde: "kartverket",
      verifisert: idag,
    });
  }
  return steder;
}

async function main() {
  const skriv = process.argv.includes("--skriv");
  const idag = new Date().toISOString().slice(0, 10);
  const forkastet: string[] = [];

  const steder = [...(await fraOslo(idag, forkastet)), ...(await fraHelsenorge(idag, forkastet))];

  const gammel: OmsorgDatasett = JSON.parse(readFileSync(FIL, "utf8"));
  // Steder som er tatt ut manuelt blir stående — de skal ikke komme tilbake ved neste kjøring.
  const manuelle = new Map(gammel.steder.filter((s) => s.status !== "i drift").map((s) => [s.id, s]));
  const nye = [...steder.filter((s) => !manuelle.has(s.id)), ...manuelle.values()].sort((a, b) =>
    a.navn.localeCompare(b.navn, "nb"),
  );

  const før = new Set(gammel.steder.map((s) => s.id));
  const etter = new Set(nye.map((s) => s.id));
  const perType = new Map<string, number>();
  for (const s of nye) perType.set(s.internalType, (perType.get(s.internalType) ?? 0) + 1);

  console.log(`\n${nye.length} omsorgstilbud (${forkastet.length} oppføringer forkastet)`);
  for (const [type, antall] of [...perType].sort((a, b) => b[1] - a[1])) console.log(`  ${antall.toString().padStart(4)}  ${type}`);
  const lagtTil = nye.filter((s) => !før.has(s.id));
  const borte = gammel.steder.filter((s) => !etter.has(s.id));
  console.log(`\n+${lagtTil.length} nye, −${borte.length} borte fra kilden`);
  for (const s of borte) console.log(`  − ${s.navn}`);
  if (process.argv.includes("--forkastet")) for (const f of forkastet) console.log(`  x ${f}`);

  if (!skriv) {
    console.log("\nKjør med --skriv for å oppdatere data/omsorgstilbud.json.");
    return;
  }
  const datasett: OmsorgDatasett = {
    verifisert: idag,
    kilder: [
      { navn: "Oslo kommune – sykehjem, helsehus og dagsentre", url: "https://www.oslo.kommune.no/helse-og-omsorg/omsorgsbolig-og-sykehjem/sykehjem/sykehjem-helsehus-og-dagsentre/" },
      { navn: "Oslo kommune – barnevernsinstitusjoner og -tiltak", url: "https://www.oslo.kommune.no/helse-og-omsorg/barn-ungdom-og-familie/barnevern-og-foreldreveiledning/barnevernsinstitusjoner-og-tiltak/" },
      { navn: "Helsenorge – behandlingssteder med offentlig tilbud", url: "https://tjenester.helsenorge.no/velg-behandlingssted/behandlingssteder" },
      { navn: "Kartverket – adresse-API (koordinat for Helsenorge-stedene)", url: KARTVERKET },
    ],
    steder: nye,
  };
  writeFileSync(FIL, `${JSON.stringify(datasett, null, 2)}\n`);
  console.log(`\nSkrev ${FIL}`);
}

void main();
