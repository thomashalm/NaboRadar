import "server-only";
import type { Polygon } from "geojson";
import { MULTE_BOKS, MULTE_DEKNING } from "@/lib/multe/omrade";
import { MULTE_WEBSPOR, type Webspor, type WebsporGeotype, type WebsporOmtale, type WebsporSignal } from "@/lib/multe/web-spor";
import { punktIFlate } from "./area";
import { rader } from "./area-features";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Multe: web-spor i Utforsk data. Internt researchlag, bare Oslo og Marka.
 *
 * Et web-spor er en offentlig anekdote, ikke en artsregistrering. Laget er derfor sitt eget
 * datasett, med egen farge, stiplet sirkel i stedet for punkt, og en fast merknad i panelet.
 * Dataene er en fil i repoet (lib/multe/web-spor.ts), ikke en tabell — begrunnelsen står der.
 * Bakgrunn: docs/research/multer-web-discovery.md.
 */
export const WEBSPOR_FORBEHOLD = "Anekdotisk nettkilde – ikke artsregistrering.";
const INTERNT = "Internt researchlag. Ikke offentlig.";
const FORKLARING =
  "Sirkelen viser et omtrentlig område rundt stedet kilden navngir. Den er ikke et funnsted og ikke en avgrensning av hvor bærene sto. Et spor sier at noen fant multer her ett år – ikke at stedet er et godt multested.";
const DATO_FORBEHOLD = "Datoene er enkeltobservasjoner fra kildene, ikke et råd om når bærene er modne.";

const SIGNAL: Record<WebsporSignal, { kort: string; type: string }> = {
  concrete_find: { kort: "Konkret funn", type: "Rapportert multefunn" },
  place_tip: { kort: "Stedstips", type: "Stedstips om multer" },
  season_observation: { kort: "Sesongobservasjon", type: "Sesongobservasjon" },
  historical_reference: { kort: "Historisk omtale", type: "Historisk omtale av multer" },
};
/** Sterkeste signal først: et sted med både funn og tips er et rapportert funn. */
const SIGNALREKKE: readonly WebsporSignal[] = ["concrete_find", "season_observation", "place_tip", "historical_reference"];

const GEOGRAFI: Record<WebsporGeotype, string> = {
  point: "Punkt oppgitt av kilden",
  approximate_area: "Omtrentlig område – ikke eksakt funnsted",
  broad_area: "Bredt område – ikke eksakt funnsted",
};
const KVALITET = { høy: "Høy", middels: "Middels", lav: "Lav" } as const;

const MAANED = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
/** «21. august 2026». Leser ISO-datoen direkte, så tidssonen ikke flytter dagen. */
const dag = (iso: string) => {
  const [aar, maaned, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d}. ${MAANED[maaned - 1]} ${aar}`;
};
const naar = (o: WebsporOmtale) => (o.dato ? dag(o.dato) : (o.tidTekst ?? (o.aar ? String(o.aar) : "udatert")));
const meter = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} km` : `${Math.round(m / 10) * 10} m`);
const flertall = (n: number, en: string, flere: string) => `${n} ${n === 1 ? en : flere}`;

/** Nyeste omtale først; udaterte sist. */
const sortert = (omtaler: readonly WebsporOmtale[]) => [...omtaler].sort((a, b) => (b.dato ?? `${b.aar ?? 0}`).localeCompare(a.dato ?? `${a.aar ?? 0}`));

/** Overskriften i listen: «Modne multer omtalt 1. august 2023». */
function hovedlinje(o: WebsporOmtale): string {
  const tid = naar(o);
  if (o.signal === "place_tip") return `Stedstips, ${tid}`;
  if (o.signal === "historical_reference") return `Historisk omtale, ${tid}`;
  const hva = o.modenhet === "modne" ? "Modne multer" : o.modenhet === "delvis modne" ? "Delvis modne multer" : o.modenhet === "umodne" ? "Umodne multer" : "Multer";
  return `${hva} omtalt ${tid}`;
}

/** Sirkel som flate: 48 hjørner er rundt nok, og holder svaret lite. */
export function sirkel([lng, lat]: readonly [number, number], radiusM: number, hjorner = 48): Polygon {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: hjorner }, (_, i) => {
    const v = (2 * Math.PI * i) / hjorner;
    return [Number((lng + dLng * Math.cos(v)).toFixed(6)), Number((lat + dLat * Math.sin(v)).toFixed(6))];
  });
  return { type: "Polygon", coordinates: [[...ring, ring[0]!]] };
}

/** Eksportert for test. */
export function websporFeature(spor: Webspor): Omit<ExploreFeature, "datasetId" | "datasetLabel"> {
  const omtaler = sortert(spor.omtaler);
  const signal = SIGNALREKKE.find((s) => omtaler.some((o) => o.signal === s))!;
  const nyeste = omtaler[0]!;
  const kilder = [...new Set(omtaler.map((o) => o.kilde))];
  const modne = omtaler.filter((o) => o.modenhet === "modne" || o.modenhet === "delvis modne");
  const aar = [...new Set(omtaler.map((o) => o.aar).filter((a): a is number => a !== null))].sort();
  const kildetall =
    spor.uavhengigeKilder > 1
      ? `${spor.uavhengigeKilder} uavhengige nettkilder`
      : omtaler.length > 1
        ? `1 nettkilde (${omtaler.length} omtaler fra samme kilde)`
        : "1 nettkilde";

  return {
    id: `webspor-${spor.id}`,
    title: spor.navn,
    kind: SIGNAL[signal].type,
    style: "multe_webspor",
    geometry: sirkel(spor.senter, spor.radiusM),
    center: spor.senter,
    place: spor.region,
    summary: [hovedlinje(nyeste), spor.uavhengigeKilder > 1 ? kildetall : null, spor.anbefaltRang ? `kandidat #${spor.anbefaltRang}` : null].filter(Boolean).join(" · "),
    details: rader([
      { label: "Signal", value: SIGNAL[signal].kort },
      { label: "Siste omtale", value: hovedlinje(nyeste) },
      { label: "Geografi", value: `${GEOGRAFI[spor.geotype]} (sirkel med radius ${meter(spor.radiusM)})` },
      { label: "Område", value: spor.omrade },
      { label: "Kommune", value: spor.region },
      { label: "Rapportert", value: aar.length ? aar.join(", ") : "udatert" },
      { label: "Nettkilder", value: kildetall },
      { label: "Kildekvalitet", value: `${KVALITET[spor.kvalitet]} (researchprioritet, ikke en sannhetsvurdering)` },
      spor.anbefaltRang ? { label: "Research-kandidat", value: `#${spor.anbefaltRang}${spor.anbefaltNotat ? ` – ${spor.anbefaltNotat}` : ""}` } : null,
      { label: "Registrerte multefunn innen 1 km", value: String(spor.fakta.funnInnen1Km) },
      { label: "Nærmeste registrerte multefunn", value: meter(spor.fakta.naermesteFunnM) },
      { label: "Myr innen 1 km", value: `${spor.fakta.myrDekar1Km} daa` },
      { label: "Mot våre data", value: `regnet fra sirkelens sentrum ${dag(spor.fakta.beregnet)}` },
      { label: "Sist verifisert", value: dag(spor.sistVerifisert) },
      spor.merknad ? { label: "Merknad", value: spor.merknad } : null,
    ]),
    links: omtaler.map((o) => ({ label: `${o.kilde}, ${naar(o)}`, url: o.kildeUrl })).filter((l, i, alle) => alle.findIndex((x) => x.url === l.url) === i),
    explanation: FORKLARING,
    // Hver omtale for seg, med dato. Ingen «beste dato»: det er observasjoner, ikke en modell.
    analysis: {
      label: "Omtaler i nettkilder",
      heading: `${flertall(omtaler.length, "omtale", "omtaler")}, ${kildetall}`,
      lines: [
        ...(modne.length ? [`Rapportert med modne bær: ${modne.map(naar).join(", ")}.`] : []),
        ...(spor.uavhengighetNotat ? [spor.uavhengighetNotat] : []),
      ],
      items: omtaler.map((o, i) => ({
        id: `webspor-${spor.id}-omtale-${i + 1}`,
        title: hovedlinje(o),
        lines: [o.sammendrag, ...(o.mengde ? [`Mengde: ${o.mengde}`] : []), `Kilde: ${o.kilde}`],
      })),
      more: 0,
      note: `${WEBSPOR_FORBEHOLD} ${DATO_FORBEHOLD}`,
    },
    notice: `${WEBSPOR_FORBEHOLD} ${INTERNT}`,
    sourceName: kilder.length === 1 ? kilder[0]! : `${kilder.length} nettsteder – se lenkene over`,
    sourceUrl: kilder.length === 1 && omtaler.length === 1 ? nyeste.kildeUrl : null,
    href: null,
    hrefLabel: null,
  };
}

export const multeWebsporDataset: ExploreDataset = {
  id: "multe-webspor",
  label: "Multe: web-spor",
  queryWord: "multe web-spor",
  unit: { one: "web-spor", many: "web-spor" },
  // Lengste alias vinner i tolkningen, så «multe web» går hit og ikke til de registrerte funnene.
  aliases: ["multe web-spor", "multer web-spor", "multe webspor", "multe web spor", "multe nettspor", "multe web", "multer web", "multespor", "web-spor", "webspor", "nettspor"],
  // 16 flater i hele dekningsområdet: vises uten sted.
  needsArea: false,
  policy: { openMap: "nei", omrade: "nei" },
  coverage: { label: MULTE_DEKNING, box: MULTE_BOKS },
  description: `Steder der offentlige nettkilder (turblogger, forum, Skiforeningen) omtaler multer. Hver sirkel er et omtrentlig område rundt et navngitt sted, ikke et funnsted. Dekker bare ${MULTE_DEKNING}. ${WEBSPOR_FORBEHOLD}`,

  async load(client, area) {
    // Dataene ligger i koden, ikke i databasen, så databasen kan ikke stoppe en ikke-admin her.
    // Derfor spør vi den uttrykkelig — samme sannhet som resten av admin bruker.
    const { data: erAdmin, error } = await client.rpc("is_admin");
    if (error || erAdmin !== true) return { features: [], total: 0, error: "Krever innlogging som admin." };

    const spor = MULTE_WEBSPOR.filter(({ senter: [lng, lat] }) => {
      if (!area) return true;
      if (area.polygon) return punktIFlate(lng, lat, area.polygon);
      const { minLng, minLat, maxLng, maxLat } = area.box;
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    });
    // Research-kandidatene først, i rangert rekkefølge; resten etter navn.
    const ordnet = [...spor].sort((a, b) => (a.anbefaltRang ?? 99) - (b.anbefaltRang ?? 99) || a.navn.localeCompare(b.navn, "nb"));
    return { features: ordnet.map(websporFeature), total: ordnet.length, error: null };
  },
};
