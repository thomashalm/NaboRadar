import { TtlCache } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import { asNumber, gmlPolygon, nested, wfsBbox, type GmlFeature } from "@/lib/providers/gml";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { AreaGeometry } from "@/types/area-feature";
import { boundsOf, centerOf, containsPoint } from "./geometry";
import type { PropertyBuilding, PropertyDetails, PropertyLookupResult } from "./types";

const TEIG_WFS = "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-eiendomskart-teig";
const BYGG_WFS = "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt";
const ADRESSE_API = "https://ws.geonorge.no/adresser/v1/punktsok";

/**
 * Finner eiendommen brukeren klikket på, fra åpne matrikkeldata.
 *
 * Discovery viste at bbox-filteret i teig-WFS-en treffer på representasjonspunktet, ikke på
 * flaten: et lite søk rundt klikkpunktet ga null treff selv om teigen omslutter punktet. Derfor
 * spør vi med buffer og avgjør selv hvilken teig som inneholder punktet — og utvider bufferet
 * én gang hvis ingen av kandidatene traff, slik at store eiendommer også finnes.
 */
const BUFFERS_DEGREES = [0.0006, 0.0025] as const; // ~65 m, deretter ~275 m
const MAX_CANDIDATES = 80;
const LOOKUP_TIMEOUT_MS = 8_000;

/** Lisensen (CC BY 4.0) tillater mellomlagring. Kort TTL: matrikkelen endres sjelden per punkt. */
const cache = new TtlCache<PropertyLookupResult>(10 * 60 * 1000, 300);

const RETRY: HttpRetryPolicy = { ...DEFAULT_RETRY_POLICY, timeoutMs: 6_000, maxRetries: 1 };

/** NS 3457-koder vi oversetter. Ukjente koder vises ikke — vi gjetter ikke bygningstype. */
const BYGNINGSTYPE: Record<string, string> = {
  "111": "Enebolig", "112": "Enebolig med hybel eller sokkelleilighet", "113": "Våningshus",
  "121": "Tomannsbolig, vertikaldelt", "122": "Tomannsbolig, horisontaldelt",
  "131": "Rekkehus", "133": "Kjedehus", "135": "Terrassehus", "136": "Andre småhus",
  "141": "Boligblokk, 2 etasjer", "142": "Boligblokk, 3–4 etasjer", "143": "Boligblokk, 3–4 etasjer",
  "144": "Boligblokk, 5 etasjer eller mer", "145": "Store sammenbygde boligbygg",
  "146": "Store frittliggende boligbygg", "152": "Bygning for bofellesskap",
  "161": "Fritidsbygg", "171": "Garasje eller uthus til bolig", "181": "Garasje eller uthus til fritidsbolig",
  "211": "Fabrikkbygning", "212": "Verkstedbygning", "216": "Bygning for renseanlegg",
  "219": "Annen industribygning", "231": "Lagerhall", "232": "Kjøle- og fryselager",
  "311": "Kontorbygning", "312": "Bankbygning eller rådhus", "313": "Mediebygning",
  "321": "Kjøpesenter eller varehus", "322": "Butikkbygning", "323": "Bensinstasjon",
  "411": "Ekspedisjonsbygning eller terminal", "412": "Jernbane- eller busstasjon",
  "511": "Hotellbygning", "522": "Restaurantbygning",
  "611": "Skolebygning", "612": "Universitets- eller høgskolebygning", "613": "Museum eller bibliotek",
  "615": "Barnehage", "621": "Sykehus", "641": "Idrettsbygning",
  "671": "Kirke eller kapell", "719": "Annen beredskapsbygning",
};

interface TeigFelt {
  feature: GmlFeature;
  geometry: AreaGeometry;
}

export interface PropertyLookupOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Hopper over mellomlagring (tester). */
  skipCache?: boolean;
}

export async function lookupProperty(
  lat: number,
  lng: number,
  options: PropertyLookupOptions = {},
): Promise<PropertyLookupResult> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (!options.skipCache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const signal = options.signal ?? AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
  let result: PropertyLookupResult;
  try {
    const teig = await findTeig(lat, lng, signal);
    if (!teig) {
      result = { status: "not-found" };
    } else {
      // Bygg og adresse er utfyllende: mangler de, viser vi eiendommen likevel.
      const [bygg, adresse] = await Promise.all([
        findBuildings(teig.geometry, signal).catch(() => []),
        findAddress(teig.geometry, lat, lng, signal).catch(() => null),
      ]);
      result = { status: "ok", property: toDetails(teig, bygg, adresse) };
    }
  } catch (error) {
    // Kilden er nede eller treg. Resten av NaboRadar skal ikke merke det.
    return { status: "error", message: error instanceof Error ? error.name : "Ukjent feil" };
  }

  if (!options.skipCache) cache.set(key, result);
  return result;
}

async function findTeig(lat: number, lng: number, signal: AbortSignal): Promise<TeigFelt | null> {
  for (const buffer of BUFFERS_DEGREES) {
    // Lengdegrader blir kortere mot nord; juster så bufferet er omtrent like bredt som høyt.
    const lngBuffer = buffer / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const features = await wfsBbox({
      baseUrl: TEIG_WFS,
      typeName: "Teig",
      bbox: [lat - buffer, lng - lngBuffer, lat + buffer, lng + lngBuffer],
      count: MAX_CANDIDATES,
      signal,
      retry: RETRY,
    });

    for (const feature of features) {
      const geometry = gmlPolygon(feature, "område");
      if (geometry && containsPoint(geometry as AreaGeometry, lng, lat)) {
        return { feature, geometry: geometry as AreaGeometry };
      }
    }
  }
  return null;
}

async function findBuildings(geometry: AreaGeometry, signal: AbortSignal): Promise<PropertyBuilding[]> {
  const features = await wfsBbox({
    baseUrl: BYGG_WFS,
    typeName: "Bygning",
    bbox: boundsOf(geometry, 0.0002),
    count: 100,
    signal,
    retry: RETRY,
  });

  const bygg: PropertyBuilding[] = [];
  for (const feature of features) {
    const punkt = pointOf(feature);
    if (!punkt || !containsPoint(geometry, punkt[0], punkt[1])) continue;
    const kode = typeof feature.bygningstype === "string" ? feature.bygningstype : null;
    bygg.push({
      bygningsnummer: typeof feature.bygningsnummer === "string" ? feature.bygningsnummer : null,
      typeCode: kode,
      typeLabel: kode ? (BYGNINGSTYPE[kode] ?? null) : null,
    });
  }
  return bygg;
}

/** Nærmeste offisielle adresse som ligger inne i teigen. */
async function findAddress(
  geometry: AreaGeometry,
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<string | null> {
  const body = (await fetchJson(
    `${ADRESSE_API}?lat=${lat}&lon=${lng}&radius=120&treffPerSide=25&asciiKompatibel=false`,
    { timeoutMs: RETRY.timeoutMs, retries: RETRY.maxRetries, baseDelayMs: RETRY.baseDelayMs, signal },
  )) as { adresser?: { adressetekst?: string; representasjonspunkt?: { lat?: number; lon?: number } }[] };

  for (const adresse of body.adresser ?? []) {
    const punkt = adresse.representasjonspunkt;
    if (!punkt?.lat || !punkt.lon || !adresse.adressetekst) continue;
    if (containsPoint(geometry, punkt.lon, punkt.lat)) return adresse.adressetekst;
  }
  return null;
}

function pointOf(feature: GmlFeature): [number, number] | null {
  const node = feature.representasjonspunkt as { Point?: { pos?: string } } | undefined;
  const pos = node?.Point?.pos;
  if (typeof pos !== "string") return null;
  const [lat, lng] = pos.trim().split(/\s+/).map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng!, lat!] : null;
}

function toDetails(teig: TeigFelt, bygg: PropertyBuilding[], adresse: string | null): PropertyDetails {
  const f = teig.feature;
  const matrikkel = typeof f.matrikkelnummerTekst === "string" ? f.matrikkelnummerTekst : "ukjent";
  // Arealet og matrikkelenhetens egenskaper ligger nøstet i GML-en.
  const areal = asNumber(nested(f, "teigareal", "Areal", "lagretBeregnetAreal"));
  const kommune = typeof f.kommunenavn === "string" ? f.kommunenavn : null;
  const enhet = (f.matrikkelenhet as { Matrikkelenhet?: Record<string, unknown> } | undefined)?.Matrikkelenhet ?? {};

  // Bare flagg vi kan forklare presist. «false» er ikke en opplysning verdt å vise.
  const flagg: PropertyDetails["flagg"] = [];
  if (enhet.harGrunnforurensing === "true") {
    flagg.push({ value: "Registrert forurensning i grunnen", source: "matrikkel-teig" });
  }
  if (enhet.harKulturminne === "true") flagg.push({ value: "Registrert kulturminne", source: "matrikkel-teig" });
  if (f.tvist === "true") flagg.push({ value: "Registrert tvist om grenser", source: "matrikkel-teig" });

  return {
    id: typeof f.uuidTeig === "string" ? f.uuidTeig : matrikkel,
    matrikkelnummer: { value: matrikkel, source: "matrikkel-teig" },
    kommune: kommune ? { value: kommune, source: "matrikkel-teig" } : null,
    tomteareal: areal !== null ? { value: areal, source: "matrikkel-teig" } : null,
    matrikkelenhetstype:
      typeof enhet.matrikkelenhetstype === "string"
        ? { value: enhet.matrikkelenhetstype, source: "matrikkel-teig" }
        : null,
    adresse: adresse ? { value: adresse, source: "kartverket-adresse" } : null,
    bygg: { value: bygg, source: "matrikkel-bygningspunkt" },
    flagg,
    geometry: teig.geometry,
    center: centerOf(teig.geometry),
  };
}

/** Eksponert for tester: nullstill mellomlagringen. */
export function clearPropertyCache() {
  cache.clear();
}
