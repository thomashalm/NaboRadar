import "server-only";
import type { MultiPolygon, Point, Polygon } from "geojson";
import { AKTSOMHET_SERVICE } from "@/lib/facts/lookups/nve";
import { KONSEKVENS_TEXT, SOURCES, STABILITET_TEXT, UNDERSOKELSE_TEXT } from "@/lib/facts/wording";
import { ArcgisClient } from "@/lib/providers/arcgis";
import type { Aktsomhet } from "./aktsomhet";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Kvikkleire i Utforsk data: NVEs kartlagte kvikkleiresoner.
 *
 * To forskjellige ting heter «kvikkleire» hos NVE, og de holdes fra hverandre her:
 *
 * - **Kartlagte kvikkleiresoner** (4 865 flater i databasen): områder som er utredet. De har
 *   faregrad, risikoklasse og status — mulig, påvist eller utredet uten fare. Det er disse
 *   datasettet viser.
 * - **Aktsomhetsområder** (148 235 flater hos NVE): et oversiktskart som sier at forholdene bør
 *   undersøkes. De ligger ikke i databasen — de er for mange, og slås opp direkte hos NVE. I
 *   Utforsk data kan de sjekkes for ett punkt om gangen (`aktsomhetVedPunkt`), og vises aldri som
 *   en kartlagt sone.
 *
 * Sonene har ikke navn eller kommune i dataene våre. Tittelen er derfor typen, og kommunen
 * kommer fra søket.
 */
const PROVIDER = "nve-kvikkleire-soner";

interface Rad {
  id: string;
  external_id: string;
  title: string;
  subtype: string;
  attributes: Record<string, string | number | null>;
  source_url: string | null;
  source_updated_at: string | null;
  geometry: Polygon | MultiPolygon;
  center: Point;
  total: number;
}

const SONE_FORKLARING =
  "En kartlagt kvikkleiresone er et område NVE har utredet. Klassifiseringen gjelder hele sonen, ikke den enkelte eiendom.";
const UTEN_FARE_FORKLARING =
  "Området er utredet, og NVE har konkludert med at det ikke er fare for områdeskred. Det er ikke det samme som at grunnen ikke er undersøkt.";

export const kvikkleireDataset: ExploreDataset = {
  id: "kvikkleire",
  label: "Kvikkleire",
  unit: { one: "kartlagt sone", many: "kartlagte soner" },
  aliases: ["kvikkleire", "kvikkleiresone", "kvikkleiresoner", "kvikkleireområde", "kvikkleireområder", "kvikkleireskred"],
  needsArea: true,
  description:
    "NVEs kartlagte kvikkleiresoner. Aktsomhetsområdene er et annet og mye større kart: de vises ikke som flater, men kan sjekkes for et punkt ved å trykke i kartet.",

  async load(client, area) {
    if (!area) return { features: [], total: 0, error: null };
    const { data, error } = await client.rpc("explore_area_features", {
      p_provider_id: PROVIDER,
      p_min_lng: area.box.minLng,
      p_min_lat: area.box.minLat,
      p_max_lng: area.box.maxLng,
      p_max_lat: area.box.maxLat,
      p_area: area.polygon,
      p_limit: 1500,
    });
    if (error) return { features: [], total: 0, error: error.message };
    const rader = (data ?? []) as Rad[];
    return {
      features: rader.map((rad) => kvikkleireFeature(rad, area.kind === "kommune" ? area.name : null)),
      total: Number(rader[0]?.total ?? 0),
      error: null,
    };
  },
};

/** Eksportert for test: hva som står i listen og panelet er produktlogikk. */
export function kvikkleireFeature(rad: Rad, kommune: string | null): ExploreFeature {
  const a = rad.attributes;
  const utenFare = rad.subtype === "kvikkleire_utredet_uten_fare";
  const tekst = (verdi: unknown) => (typeof verdi === "string" && verdi ? verdi : null);
  const tall = (verdi: unknown) => (typeof verdi === "number" && Number.isFinite(verdi) ? verdi : null);

  const stabilitet = tekst(a.stabilitet);
  const faregrad = tekst(a.faregrad);
  const risiko = tall(a.risikoklasse);
  const konsekvens = KONSEKVENS_TEXT[tekst(a.konsekvens) ?? ""];
  const undersokelse = UNDERSOKELSE_TEXT[tekst(a.undersokelse) ?? ""];
  const aar = tall(a.vurdertAar);
  // «Mulig», «påvist» og «utredet uten fare» er kildens tre tilstander, og de skal ikke blandes.
  const status = utenFare ? "Utredet: ikke fare" : stabilitet === "mulig" ? "Mulig kvikkleire, ikke påvist" : stabilitet ? "Kvikkleire påvist" : null;

  const details = [
    { label: "Type", value: utenFare ? "Utredet område uten fare for områdeskred" : "Kartlagt kvikkleiresone" },
    stabilitet && STABILITET_TEXT[stabilitet] ? { label: "Status", value: STABILITET_TEXT[stabilitet]! } : null,
    // Risikoklasse 0 hører til områdene uten fare. Mangler tallet, sier vi det ikke.
    risiko !== null ? { label: "Risikoklasse", value: `${risiko} av 5` } : null,
    faregrad ? { label: "Faregrad", value: faregrad.toLowerCase() } : null,
    konsekvens ? { label: "Konsekvens", value: konsekvens } : null,
    { label: "Områdetype", value: a.omradetype === "utlopsomrade" ? "utløpsområde" : "løsneområde" },
    undersokelse ? { label: "Undersøkelsesnivå", value: undersokelse } : null,
    aar ? { label: "Vurdert", value: String(aar) } : null,
    kommune ? { label: "Kommune", value: kommune } : null,
    rad.source_updated_at ? { label: "Sist oppdatert i kilden", value: new Date(rad.source_updated_at).toLocaleDateString("nb-NO", { dateStyle: "medium" }) } : null,
    { label: "Sone-ID", value: rad.external_id },
  ].filter((rad): rad is { label: string; value: string } => rad !== null);

  return {
    id: rad.id,
    title: rad.title,
    kind: utenFare ? "Utredet uten fare" : "Kartlagt kvikkleiresone",
    style: utenFare ? "kvikkleire_uten_fare" : "kvikkleire_sone",
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: kommune,
    summary: [status, !utenFare && risiko !== null ? `risikoklasse ${risiko} av 5` : null].filter(Boolean).join(" · ") || null,
    details,
    explanation: utenFare ? UTEN_FARE_FORKLARING : SONE_FORKLARING,
    notice: null,
    sourceName: `${SOURCES[PROVIDER]?.name ?? "Kartlagte kvikkleiresoner"} (NVE)`,
    sourceUrl: rad.source_url,
    href: null,
    hrefLabel: null,
  };
}

/**
 * Om et punkt ligger i NVEs aktsomhetsområde for kvikkleireskred. Direkte oppslag, som på
 * `/omrade` — men her skilles også «utenfor» fra «ikke kartlagt», fordi admin trenger å vite
 * hvilken av dem det er. Kaster ved feil: en feil er ikke «utenfor».
 */
export async function aktsomhetVedPunkt(lat: number, lng: number, fetchImpl: typeof fetch = fetch): Promise<Aktsomhet> {
  const client = new ArcgisClient(fetchImpl, { timeoutMs: 6_000, maxRetries: 1, baseDelayMs: 200 });
  const point = { lat, lng };
  const [inne, dekning] = await Promise.all([
    client.query(AKTSOMHET_SERVICE, 0, { point, returnGeometry: false, outFields: ["objectid"] }),
    client.query(AKTSOMHET_SERVICE, 1, { point, returnGeometry: false, outFields: ["dekningstatus"] }),
  ]);
  if (dekning.length === 0) return "ikke_kartlagt";
  return inne.length > 0 ? "innenfor" : "utenfor";
}
