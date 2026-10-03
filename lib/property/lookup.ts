import { z } from "zod";
import { TtlCache } from "@/lib/cache";
import { WMS_BOKS, wmsUtsnittoppslag, type WmsFelt } from "@/lib/facts/lookups/wms";
import { fetchJson } from "@/lib/http";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { AreaGeometry } from "@/types/area-feature";
import { bygningstypeNavn } from "./bygningstype";
import { boundsOf, centerOf, containsPoint } from "./geometry";
import type { PropertyBuilding, PropertyDetails, PropertyLookupResult } from "./types";

const EIENDOM_API = "https://api.kartverket.no/eiendom/v1/punkt/omrader";
const MATRIKKELKART_WMS = "https://wms.geonorge.no/skwms1/wms.matrikkelkart";
const ADRESSE_API = "https://ws.geonorge.no/adresser/v1/punktsok";

/**
 * Finner eiendommen brukeren klikket på, fra åpne matrikkeldata.
 *
 * KILDER (byttet 2026-10-03, se docs/research/eiendomskort.md):
 *
 * - Teigen (flate og matrikkelnummer): Kartverkets Eiendom-API. Det svarer med flatene som
 *   omslutter punktet, så vi trenger ikke lenger buffer-søket WFS-en krevde.
 * - Areal, kommunenavn og tvist: matrikkelkartets WMS, laget `teiger`. Treffet må ha samme
 *   teig-id som Eiendom-API-et ga, ellers brukes det ikke.
 * - Bygg: samme WMS, laget `bygning_symbol`, alle punkter i teigens utsnitt.
 *
 * Matrikkel-WFS-ene vi brukte før (`wfs.matrikkelen-eiendomskart-teig` og `-bygningspunkt`) sto
 * nede i timevis 2026-10-03, på samme Geonorge-bakmaskin som tok ned stormflo (ADR 015).
 *
 * FEIL ER IKKE FRAVÆR:
 *
 * - Bare et gyldig, tomt svar fra Eiendom-API-et betyr «ingen eiendom her». HTTP-feil,
 *   tidsavbrudd og svar som ikke passer skjemaet, gir `error`.
 * - Feiler bygg- eller arealoppslaget, blir feltet `null` (ukjent). Det blir aldri «ingen bygg».
 */
const LOOKUP_TIMEOUT_MS = 8_000;

/** Lisensen (CC BY 4.0) tillater mellomlagring. Kort TTL: matrikkelen endres sjelden per punkt. */
const cache = new TtlCache<PropertyLookupResult>(10 * 60 * 1000, 300);

const RETRY: HttpRetryPolicy = { ...DEFAULT_RETRY_POLICY, timeoutMs: 6_000, maxRetries: 1 };

/**
 * Lagene `teig` og `bygning_symbol` tegnes bare i målestokk 1:5 000 og 1:2 000 eller finere, og
 * svarer tomt ellers. MapServer regner målestokken fra utsnittets bredde i grader, som om én grad
 * var like lang øst–vest som nord–sør. 0,45 «gradmeter» per piksel gir ca. 1:1 600.
 */
const METER_PER_GRAD = 111_320;
const METER_PER_PIKSEL = 0.45;
/** Tjenesten tillater 8 192 piksler. Større teiger får ukjent bygg i stedet for et halvt svar. */
const MAKS_PIKSLER = 6_000;
const MAKS_BYGG = 2_000;

/**
 * Matrikkelkartet har også bygg som ikke står der: revet eller brent (BR), bygging avlyst (BA),
 * utgått bygningsnummer (BU) og flyttet (BF). Det åpne datasettet «Matrikkelen – Bygningspunkt»
 * utelater dem, og det gjør vi også. Uten filteret fikk Ullevål sykehus 52 bygg i stedet for 42.
 */
const FINNES_IKKE = new Set(["BR", "BA", "BU", "BF"]);

/** Norge med margin. Koordinater utenfor betyr byttet akserekkefølge eller feil CRS. */
const erINorge = (lng: number, lat: number) => lng > 3 && lng < 33 && lat > 57 && lat < 72;

const posisjon = z.array(z.number()).min(2);
const eiendomSvar = z.object({
  features: z.array(
    z.object({
      geometry: z.discriminatedUnion("type", [
        z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(posisjon)) }),
        z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(posisjon))) }),
      ]),
      properties: z.object({
        lokalid: z.number(),
        matrikkelnummertekst: z.string().min(1),
        kommunenummer: z.string().regex(/^\d{4}$/),
        objekttype: z.string(),
      }),
    }),
  ),
});

interface Teig {
  lokalid: number;
  matrikkelnummer: string;
  kommunenummer: string;
  geometry: AreaGeometry;
}

interface TeigOpplysninger {
  areal: number | null;
  kommunenavn: string | null;
  tvist: boolean;
}

export interface PropertyLookupOptions {
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
      // Areal, bygg og adresse er utfyllende: mangler de, viser vi eiendommen likevel, og
      // feltet blir ukjent (null).
      const [opplysninger, bygg, adresse] = await Promise.all([
        findTeigOpplysninger(teig, lat, lng, signal).catch(() => null),
        findBuildings(teig.geometry, signal).catch(() => null),
        findAddress(teig.geometry, lat, lng, signal).catch(() => null),
      ]);
      result = { status: "ok", property: toDetails(teig, opplysninger, bygg, adresse) };
    }
  } catch (error) {
    // Kilden er nede eller treg. Resten av NaboRadar skal ikke merke det.
    return { status: "error", message: error instanceof Error ? error.name : "Ukjent feil" };
  }

  if (!options.skipCache) cache.set(key, result);
  return result;
}

/** Teigen som omslutter punktet. null bare når kilden svarte gyldig uten en slik teig. */
async function findTeig(lat: number, lng: number, signal: AbortSignal): Promise<Teig | null> {
  const params = new URLSearchParams({
    nord: String(lat),
    ost: String(lng),
    koordsys: "4258",
    utkoordsys: "4258",
    radius: "1",
    maksTreff: "20",
  });
  const body = await fetchJson(`${EIENDOM_API}?${params.toString()}`, {
    timeoutMs: RETRY.timeoutMs,
    retries: RETRY.maxRetries,
    baseDelayMs: RETRY.baseDelayMs,
    signal,
  });
  const { features } = eiendomSvar.parse(body);

  for (const feature of features) {
    // Anleggsprojeksjonsflater (f.eks. garasjeanlegg under bakken) er ikke tomta brukeren klikket på.
    if (feature.properties.objekttype !== "Teig") continue;
    const geometry = feature.geometry as AreaGeometry;
    const [sør, vest, nord, øst] = boundsOf(geometry);
    if (!erINorge(vest, sør) || !erINorge(øst, nord)) throw new Error("Eiendom-API: koordinater utenfor Norge");
    if (!containsPoint(geometry, lng, lat)) continue;
    return {
      lokalid: feature.properties.lokalid,
      matrikkelnummer: feature.properties.matrikkelnummertekst,
      kommunenummer: feature.properties.kommunenummer,
      geometry,
    };
  }
  return null;
}

/** Areal og kommunenavn for teigen, fra matrikkelkartet. Kaster når teigen ikke er i svaret. */
async function findTeigOpplysninger(teig: Teig, lat: number, lng: number, signal: AbortSignal): Promise<TeigOpplysninger> {
  const piksler = 101;
  const dLat = ((piksler * METER_PER_PIKSEL) / METER_PER_GRAD) / 2;
  const lag = await wmsUtsnittoppslag({
    url: MATRIKKELKART_WMS,
    layers: ["teiger"],
    sør: lat - dLat,
    vest: lng - dLat,
    nord: lat + dLat,
    øst: lng + dLat,
    bredde: piksler,
    høyde: piksler,
    i: 50,
    j: 50,
    maksTreff: 10,
    retry: RETRY,
    signal,
  });
  const treff = [...lag.values()].flat().find((felt) => felt.teigid === String(teig.lokalid));
  if (!treff) throw new Error("Matrikkelkartet har ikke teigen under punktet");
  const areal = Number(treff.lagretberegnetareal);
  return {
    areal: treff.lagretberegnetareal && Number.isFinite(areal) && areal > 0 ? areal : null,
    kommunenavn: treff.kommunenavn || null,
    tvist: treff.tvist === "true",
  };
}

/** Bygningspunktene som ligger inne i teigen. Kaster når svaret ikke kan være fullstendig. */
async function findBuildings(geometry: AreaGeometry, signal: AbortSignal): Promise<PropertyBuilding[]> {
  const [sør, vest, nord, øst] = boundsOf(geometry, 0.0001);
  const bredde = Math.ceil(((øst - vest) * METER_PER_GRAD) / METER_PER_PIKSEL);
  const høyde = Math.ceil(((nord - sør) * METER_PER_GRAD) / METER_PER_PIKSEL);
  if (bredde > MAKS_PIKSLER || høyde > MAKS_PIKSLER) throw new Error("Teigen er for stor for ett bygningsoppslag");

  const lag = await wmsUtsnittoppslag({
    url: MATRIKKELKART_WMS,
    layers: ["bygning_symbol"],
    sør,
    vest,
    nord,
    øst,
    bredde,
    høyde,
    i: 0,
    j: 0,
    maksTreff: MAKS_BYGG,
    heleUtsnittet: true,
    retry: RETRY,
    signal,
  });
  const treff = [...lag.values()].flat();
  if (treff.length >= MAKS_BYGG) throw new Error("Flere bygg i utsnittet enn ett svar rommer");

  const bygg = new Map<string, PropertyBuilding>();
  for (const felt of treff) {
    const punkt = punktAv(felt);
    if (!felt.bygningsnummer || !punkt) throw new Error("Bygningspunkt uten nummer eller posisjon");
    if (!felt.bygningsstatus) throw new Error("Bygningspunkt uten status");
    if (FINNES_IKKE.has(felt.bygningsstatus)) continue;
    if (!containsPoint(geometry, punkt[0], punkt[1])) continue;
    const kode = felt.bygningstype || null;
    bygg.set(felt.bygningsnummer, { bygningsnummer: felt.bygningsnummer, typeCode: kode, typeLabel: bygningstypeNavn(kode) });
  }
  return [...bygg.values()];
}

/** [lng, lat] fra treffets boks, som MapServer skriver «lng,lat lng,lat». */
function punktAv(felt: WmsFelt): [number, number] | null {
  const [hjørne] = (felt[WMS_BOKS] ?? "").split(/\s+/);
  const [lng, lat] = (hjørne ?? "").split(",").map(Number);
  if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (!erINorge(lng, lat)) throw new Error("Matrikkelkartet: koordinater utenfor Norge");
  return [lng, lat];
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

function toDetails(
  teig: Teig,
  opplysninger: TeigOpplysninger | null,
  bygg: PropertyBuilding[] | null,
  adresse: string | null,
): PropertyDetails {
  // Bare flagg vi kan forklare presist. «false» er ikke en opplysning verdt å vise.
  const flagg: PropertyDetails["flagg"] = [];
  if (opplysninger?.tvist) flagg.push({ value: "Registrert tvist om grenser", source: "matrikkel-teig" });

  return {
    id: String(teig.lokalid),
    matrikkelnummer: { value: teig.matrikkelnummer, source: "matrikkel-teig" },
    kommune: opplysninger?.kommunenavn ? { value: opplysninger.kommunenavn, source: "matrikkel-teig" } : null,
    tomteareal: opplysninger?.areal ? { value: opplysninger.areal, source: "matrikkel-teig" } : null,
    adresse: adresse ? { value: adresse, source: "kartverket-adresse" } : null,
    bygg: bygg ? { value: bygg, source: "matrikkel-bygningspunkt" } : null,
    flagg,
    geometry: teig.geometry,
    center: centerOf(teig.geometry),
  };
}

/** Eksponert for tester: nullstill mellomlagringen. */
export function clearPropertyCache() {
  cache.clear();
}
