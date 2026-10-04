import "server-only";
import { KANTARELLFUNN_PROVIDER, MULTE_BOKS, MULTE_DEKNING, MULTEFUNN_PROVIDER, STEINSOPPFUNN_PROVIDER, TYTTEBAERFUNN_PROVIDER } from "@/lib/multe/omrade";
import { dato, hentAreaFeatures, rader, tall, tekst, type AreaFeatureRad } from "./area-features";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Registrerte artsfunn i Utforsk data: multe, tyttebær, kantarell og steinsopp. Interne
 * researchlag, bare Oslo og Marka.
 *
 * Et funn er en observasjon: noen så planten der den dagen. Det sier ikke at den står der nå, og
 * ingenting om bær. Panelet sier det, og gjør ikke et gammelt funn til en bestand.
 * Bakgrunn: docs/research/multer-oslo.md og docs/research/tyttebaer-oslo.md.
 */
export const INTERNT = "Internt researchlag. Ikke offentlig.";
export const FUNN_FORBEHOLD = "Registrert observasjon – sier ikke noe sikkert om forekomst i dag.";
/** Fra denne alderen sier panelet uttrykkelig at funnet er gammelt. */
const ELDRE_ETTER_AAR = 10;

const MAANED = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

/** Det som skiller ett artsfunn-datasett fra et annet. */
interface Art {
  id: string;
  label: string;
  queryWord: string;
  aliases: readonly string[];
  providerId: string;
  /** «Multe (Rubus chamaemorus)». */
  art: string;
  /** «Multefunn» — første ord i tittelen på et funn. */
  funnord: string;
  style: "multefunn" | "tyttebaerfunn" | "kantarellfunn" | "steinsoppfunn";
  description: string;
  /** Setningen et funn på ti år eller mer får i tillegg. Standard gjelder planter. */
  gammeltTekst?: (aar: number) => string;
  /** Vis og sorter etter funn i flere sesonger på samme sted (se providerens «GJENTAK»). */
  gjentak?: boolean;
}

function artsfunnDataset(art: Art): ExploreDataset {
  return {
    id: art.id,
    label: art.label,
    queryWord: art.queryWord,
    unit: { one: "registrert funn", many: "registrerte funn" },
    aliases: art.aliases,
    // Noen hundre til et par tusen punkter i hele dekningsområdet: kan vises uten sted.
    needsArea: false,
    policy: { openMap: "nei", omrade: "nei" },
    coverage: { label: MULTE_DEKNING, box: MULTE_BOKS },
    description: art.description,

    async load(client, area) {
      const svar = await hentAreaFeatures(client, art.providerId, area ?? { kind: "utsnitt", name: null, county: null, box: MULTE_BOKS, polygon: null }, 2000);
      if (svar.error) return { features: [], total: 0, error: svar.error };
      return {
        // Nyeste først: de sier mest om i dag. Med gjentak: stedene med flest sesonger først.
        features: svar.rader.map((rad) => artsfunnFeature(rad, art)).sort((a, b) => b.sort - a.sort || a.id.localeCompare(b.id)).map(({ sort: _sort, ...f }) => f),
        total: svar.total,
        error: null,
      };
    },
  };
}

const MULTE: Art = {
  id: "multefunn",
  label: "Multe: registrerte funn",
  queryWord: "multefunn",
  aliases: ["registrerte multefunn", "multefunn", "multer", "multe", "multebær", "molter", "molte"],
  providerId: MULTEFUNN_PROVIDER,
  art: "Multe (Rubus chamaemorus)",
  funnord: "Multefunn",
  style: "multefunn",
  description: `Registrerte funn av multe fra GBIF (Artsobservasjoner, museer m.fl.), fra 2000 og med presisjon på 100 m eller bedre. Dekker bare ${MULTE_DEKNING}. ${FUNN_FORBEHOLD}`,
};

const TYTTEBAER: Art = {
  id: "tyttebaerfunn",
  label: "Tyttebær: registrerte funn",
  queryWord: "tyttebærfunn",
  aliases: ["registrerte tyttebærfunn", "tyttebær funn", "tyttebærfunn", "tyttebaerfunn", "tyttebær", "tyttebaer"],
  providerId: TYTTEBAERFUNN_PROVIDER,
  art: "Tyttebær (Vaccinium vitis-idaea)",
  funnord: "Tyttebærfunn",
  style: "tyttebaerfunn",
  // Kildene sier ikke om planten hadde bær. Det står her, så ingen leser et funn som et bærsted.
  description: `Registrerte funn av tyttebær fra GBIF (Artsobservasjoner m.fl.), fra 2000 og med presisjon på 100 m eller bedre. Dekker bare ${MULTE_DEKNING}. Funnene gjelder planten: kildene sier ikke om den hadde bær. ${FUNN_FORBEHOLD}`,
};

export const GJENTAK_FORBEHOLD = "En opptelling av registreringer, ikke en sannsynlighet. Mange funn kan også bety at mange har lett akkurat her.";

const KANTARELL: Art = {
  id: "kantarellfunn",
  label: "Kantarell: registrerte funn",
  queryWord: "kantarellfunn",
  aliases: ["registrerte kantarellfunn", "kantarell funn", "kantarellfunn", "kantareller", "kantarell", "cantharellus cibarius"],
  providerId: KANTARELLFUNN_PROVIDER,
  art: "Kantarell (Cantharellus cibarius)",
  funnord: "Kantarellfunn",
  style: "kantarellfunn",
  gjentak: true,
  // Mycelet lever i bakken i mange år. Et gammelt funn er derfor ikke uinteressant — men det
  // lover heller ikke sopp i år.
  gammeltTekst: (aar) => `Funnet er fra ${aar}. Mycelet kan leve lenge på samme sted, men funnet sier ikke om det kommer sopp i år.`,
  description: `Registrerte funn av kantarell fra GBIF (Artsobservasjoner m.fl.), fra 2000 og med presisjon på 100 m eller bedre. Dekker bare ${MULTE_DEKNING}. Steder med funn i flere sesonger står først. ${FUNN_FORBEHOLD}`,
};

const STEINSOPP: Art = {
  id: "steinsoppfunn",
  label: "Steinsopp: registrerte funn",
  queryWord: "steinsoppfunn",
  aliases: ["registrerte steinsoppfunn", "steinsopp funn", "steinsoppfunn", "steinsopper", "steinsopp", "boletus edulis", "karljohan"],
  providerId: STEINSOPPFUNN_PROVIDER,
  art: "Steinsopp (Boletus edulis)",
  funnord: "Steinsoppfunn",
  style: "steinsoppfunn",
  gjentak: true,
  // Mycelet kan leve lenge, men fruktlegemene varierer mye fra år til år. Ingen påstand om at
  // stedet fortsatt gir sopp.
  gammeltTekst: (aar) => `Funnet er fra ${aar}. Et gammelt funn kan fortsatt være interessant, men sier ikke om det kommer steinsopp her i år.`,
  description: `Registrerte funn av steinsopp (Boletus edulis) fra GBIF (Artsobservasjoner m.fl.), fra 2000 og med presisjon på 100 m eller bedre. Bleklodden og rødbrun steinsopp er egne arter og er ikke med. Dekker bare ${MULTE_DEKNING}. Steder med funn i flere sesonger står først. ${FUNN_FORBEHOLD}`,
};

export const multefunnDataset = artsfunnDataset(MULTE);
export const steinsoppfunnDataset = artsfunnDataset(STEINSOPP);
export const kantarellfunnDataset = artsfunnDataset(KANTARELL);
export const tyttebaerfunnDataset = artsfunnDataset(TYTTEBAER);

/** Eksportert for test: multefunn med årets dato som «nå». */
export const multefunnFeature = (rad: AreaFeatureRad, iAar = new Date().getFullYear()) => artsfunnFeature(rad, MULTE, iAar);
export const tyttebaerfunnFeature = (rad: AreaFeatureRad, iAar = new Date().getFullYear()) => artsfunnFeature(rad, TYTTEBAER, iAar);
export const kantarellfunnFeature = (rad: AreaFeatureRad, iAar = new Date().getFullYear()) => artsfunnFeature(rad, KANTARELL, iAar);
export const steinsoppfunnFeature = (rad: AreaFeatureRad, iAar = new Date().getFullYear()) => artsfunnFeature(rad, STEINSOPP, iAar);

/** `iAar` er året «nå», så teksten om alder kan testes. */
function artsfunnFeature(rad: AreaFeatureRad, art: Art, iAar = new Date().getFullYear()): Omit<ExploreFeature, "datasetId" | "datasetLabel"> & { sort: number } {
  const a = rad.attributes;
  const aar = tall(a.aar);
  const maaned = tall(a.maaned);
  const dag = dato(tekst(a.dato));
  const presisjon = tall(a.presisjonM);
  const datasett = tekst(a.datasett);
  const lisens = tekst(a.lisens);
  const iRuta = tall(a.funnIRuta);
  const naar = maaned && aar ? `${MAANED[maaned - 1]} ${aar}` : aar ? String(aar) : null;
  const gammelt = aar !== null && iAar - aar >= ELDRE_ETTER_AAR;

  // Gjentak: registreringer innen 250 m, talt opp ved import.
  const naer = art.gjentak ? tall(a.funnINaerheten) : null;
  const sesonger = art.gjentak ? tall(a.aarINaerheten) : null;
  const aarliste = tekst(a.aarliste);
  const flereAar = sesonger !== null && sesonger >= 2;
  const spenn = aarliste ? aarliste.split(", ") : [];
  const fraTil = spenn.length > 1 ? `${spenn[0]}–${spenn.at(-1)}` : (spenn[0] ?? null);
  const observatorer = tall(a.observatorerINaerheten);

  return {
    id: rad.id,
    title: naar ? `${art.funnord}, ${naar}` : art.funnord,
    kind: "Registrert funn",
    style: art.style,
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: null,
    summary: [flereAar ? `Registrert i ${sesonger} ulike år innen 250 m` : null, presisjon !== null ? `presisjon ${presisjon} m` : null, flereAar ? null : datasett].filter(Boolean).join(" · ") || null,
    details: rader([
      { label: "Art", value: art.art },
      dag ? { label: "Dato", value: dag } : null,
      aar ? { label: "Registreringsår", value: String(aar) } : null,
      presisjon !== null ? { label: "Presisjon", value: `${presisjon} m` } : null,
      tekst(a.type) ? { label: "Type", value: tekst(a.type)! } : null,
      datasett ? { label: "Datasett", value: datasett } : null,
      tekst(a.prosjekt) ? { label: "Prosjekt", value: tekst(a.prosjekt)! } : null,
      lisens ? { label: "Lisens", value: lisens } : null,
      iRuta !== null && iRuta > 1 ? { label: "Funn i samme 100 m-rute", value: `${iRuta} (det nyeste vises)` } : null,
      a.bilde === true ? { label: "Bilde", value: "ja, hos kilden" } : null,
      a.validert === true ? { label: "Kvalitetssikret", value: "ja, av kilden" } : null,
      { label: "GBIF-ID", value: rad.external_id },
    ]),
    // Egen blokk for funn i flere sesonger. Opptelling, merket som det.
    ...(naer !== null && naer > 1 && fraTil
      ? {
          analysis: {
            label: "Registrert her før",
            heading: flereAar ? `Registrert i ${sesonger} ulike år` : `${naer} registrerte funn samme år`,
            lines: [
              `${naer} registrerte funn innen 250 m, ${flereAar ? `fra ${fraTil}` : `alle fra ${fraTil}`}.`,
              ...(flereAar && aarliste ? [`År: ${aarliste}.`] : []),
              ...(observatorer !== null && observatorer > 0 ? [`${observatorer} ${observatorer === 1 ? "observatør" : "ulike observatører"}.`] : []),
            ],
            items: [],
            more: 0,
            note: GJENTAK_FORBEHOLD,
          },
        }
      : {}),
    // Et gammelt funn tolkes ikke som en bestand. Det sies, det skjules ikke.
    explanation: gammelt ? `${FUNN_FORBEHOLD} ${art.gammeltTekst ? art.gammeltTekst(aar!) : `Funnet er fra ${aar}: det sier lite om hva som står der nå.`}` : FUNN_FORBEHOLD,
    notice: INTERNT,
    sourceName: [datasett ?? "GBIF", datasett ? "via GBIF" : null, lisens ? `(${lisens})` : null].filter(Boolean).join(" "),
    sourceUrl: rad.source_url,
    href: null,
    hrefLabel: null,
    // Sesonger først (bare med gjentak), så nyeste.
    sort: (sesonger ?? 0) * 1_000_000 + (aar ?? 0) * 100 + (maaned ?? 0),
  };
}
