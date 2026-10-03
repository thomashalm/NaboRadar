import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getDbMode, getReadDb } from "@/lib/db";
import { DatabaseQueryError, type Db } from "@/lib/db/types";
import { municipalityNames } from "@/lib/geo/municipalities";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countyCounts, findCounty, groupCountyHuts, type CountyCount, type CountyListing, type IndexHut } from "./counties";
import {
  HUT_BOUNDS,
  HUT_ACCESS_KINDS,
  HUT_ACCESS_STATUSES,
  HUT_OVERNIGHT,
  HUT_OWNER_KINDS,
  HUT_TYPES,
  type HutAccessKind,
  type HutOwnerKind,
  type HutType,
} from "./types";

/**
 * Lesing av hytter og koier. Alt går gjennom huts_*-funksjonene i databasen.
 *
 * To lesestier:
 *
 *   - Hyttesiden (`getHut`) leser alltid anonymt, uten brukerens cookies. Da er siden lik for
 *     alle — mennesker, søkemotorer og admin — og kan caches. Funksjonene svarer bare for hytter
 *     som vises offentlig.
 *   - Kartet, søket og nærområdet leser med brukerens egen sesjon. Det var slik en admin kunne
 *     se hyttene før lansering; de sidene caches ikke, så det koster ingenting å beholde det.
 *
 * Skjulte og avviste hytter kontrolleres i /admin/hytter, ikke på de offentlige sidene.
 */

const rowSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.enum(HUT_TYPES),
  owner_kind: z.enum(HUT_OWNER_KINDS),
  manager_name: z.string().nullable(),
  access_status: z.enum(HUT_ACCESS_STATUSES),
  locked: z.boolean().nullable(),
  overnight: z.enum(HUT_OVERNIGHT),
  beds: z.number().nullable(),
  booking_url: z.string().nullable(),
  info_url: z.string().nullable(),
  municipality_number: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  source_updated_at: z.string().nullable(),
  last_seen_at: z.string(),
  sources: z.array(z.string()),
  // En verdi denne versjonen ikke kjenner, skal ikke velte hele lista: da er tilgangen ukjent.
  access_kind: z.enum(HUT_ACCESS_KINDS).catch("unknown"),
  public_note: z.string().nullable(),
  overridden: z.array(z.string()),
  distance_m: z.number().optional(),
  total: z.coerce.number().optional(),
  // Bare get_hut gir høyden. Den er lagret per hytte, ikke slått opp ved visning.
  terrain_elevation_m: z.number().nullable().optional(),
});

export interface Hut {
  id: string;
  name: string;
  type: HutType;
  ownerKind: HutOwnerKind;
  managerName: string | null;
  accessStatus: (typeof HUT_ACCESS_STATUSES)[number];
  /** Dør og nøkkel: forvalterens opplysning når den er kontrollert, ellers Kartverkets. */
  access: HutAccessKind;
  /** Én kort, kildebelagt setning brukeren trenger. Aldri det interne notatet. */
  publicNote: string | null;
  /** Feltene som er kontrollert mot forvalteren og avviker fra, eller utfyller, Kartverket. */
  overridden: string[];
  overnight: (typeof HUT_OVERNIGHT)[number];
  beds: number | null;
  bookingUrl: string | null;
  infoUrl: string | null;
  municipalityNumber: string | null;
  lat: number;
  lng: number;
  sourceUpdatedAt: string | null;
  /** Avstand fra søkepunktet. Bare satt av radiusspørringen. */
  distanceM: number | null;
  /** Kommune- og fylkesnavn, når kommuneregisteret svarte. Fylles inn av `withMunicipalityNames`. */
  municipalityName?: string | null;
  countyName?: string | null;
  /** Terrenghøyden ved hytta, fra Kartverkets høydemodell, lagret ved sync. Bare satt på hyttesiden. */
  elevationM?: number | null;
}

function toHut(row: z.infer<typeof rowSchema>): Hut {
  return {
    id: row.id,
    name: row.name,
    type: row.hut_type,
    ownerKind: row.owner_kind,
    managerName: row.manager_name,
    accessStatus: row.access_status,
    access: row.access_kind,
    publicNote: row.public_note,
    overridden: row.overridden,
    overnight: row.overnight,
    beds: row.beds,
    bookingUrl: row.booking_url,
    infoUrl: row.info_url,
    municipalityNumber: row.municipality_number,
    lat: row.latitude,
    lng: row.longitude,
    sourceUpdatedAt: row.source_updated_at,
    distanceM: row.distance_m ?? null,
    ...(row.terrain_elevation_m !== undefined ? { elevationM: row.terrain_elevation_m } : {}),
  };
}

/** Så mange rader gir Supabase-API-et i ett svar (prosjektets «max rows»). */
const API_PAGE = 1000;

/**
 * `fra` henter svaret fra og med den raden. Supabase-API-et gir høyst 1 000 rader per kall,
 * uansett hva funksjonen selv tillater, så et større svar må hentes i flere omganger.
 */
async function hutRpc(fn: string, args: Record<string, unknown>, fra = 0): Promise<unknown[] | null> {
  if (getDbMode() === "supabase") {
    const client = await createSupabaseServerClient();
    if (!client) return null;
    const kall = client.rpc(fn, args);
    const { data, error } = fra > 0 ? await kall.range(fra, fra + API_PAGE - 1) : await kall;
    if (error) throw new DatabaseQueryError(fn, error.message);
    return (data as unknown[] | null) ?? [];
  }
  // Lokalt finnes ingen slik grense: første kall gir alt, og det er ikke noe mer å hente.
  if (fra > 0) return [];
  const db = await getReadDb();
  return db ? db.rpc<unknown>(fn, args) : null;
}

/**
 * Anonym lesing for de offentlige hyttesidene: publishable key, ingen cookies. Svaret er det
 * samme for alle, og siden kan derfor caches. Feil kastes, så en mislykket visning aldri caches.
 */
async function publicHutRpc(fn: string, args: Record<string, unknown>): Promise<unknown[] | null> {
  const db = await getReadDb();
  return db ? db.rpc<unknown>(fn, args) : null;
}

export interface HutFilters {
  types?: readonly HutType[];
  owners?: readonly HutOwnerKind[];
}

const filterArgs = (filters: HutFilters = {}) => ({
  types: filters.types && filters.types.length > 0 ? [...filters.types] : null,
  owners: filters.owners && filters.owners.length > 0 ? [...filters.owners] : null,
});

/**
 * «I nærheten» for hytter.
 *
 * Hytter er ikke butikker: de nærmeste ligger ofte en mil unna, og det er fortsatt lokalt.
 * Samtidig skal ikke halve fylket telle. Regelen er derfor en trapp: 10 km først, så 20 km,
 * så 30 km — og den stopper på første trinn som gir minst tre treff. Aldri lenger enn 30 km.
 *
 * Trappen er satt etter kontroll mot tolv adresser i og rundt Oslomarka (docs/data-roadmap.md):
 * i Oslo, Bærum, Asker og Nittedal gir 10 km sju til ti hytter; i Lillestrøm, Ski, Hønefoss og
 * Drøbak gir 10 km null til to, og 20 km sju til seksten. Med 15 km som første trinn fikk Oslo
 * sentrum 21 treff, som er marka og ikke nabolaget.
 */
export const HUT_NEARBY = {
  radiusStepsM: [10_000, 20_000, 30_000],
  /** Færre treff enn dette utløser neste trinn. */
  minHits: 3,
  /** Kort som vises på områdesiden. */
  maxCards: 4,
  /** Rader hentet per oppslag. Treffer vi taket, sier teksten «over». */
  fetchLimit: 100,
} as const;

/** Velger radius og kort fra en avstandssortert liste. Ren funksjon, slik at regelen kan testes. */
export function selectNearbyHuts(huts: readonly Hut[], fetchLimit: number = HUT_NEARBY.fetchLimit) {
  const innen = (radiusM: number) => huts.filter((hut) => (hut.distanceM ?? Infinity) <= radiusM);
  const steps = HUT_NEARBY.radiusStepsM;
  const radiusM = steps.find((step) => innen(step).length >= HUT_NEARBY.minHits) ?? steps[steps.length - 1]!;
  const bruk = innen(radiusM);
  return {
    radiusM,
    count: bruk.length,
    /** Sant når oppslaget traff radgrensen, og antallet derfor er et minimum. */
    capped: huts.length >= fetchLimit && bruk.length === huts.length,
    cards: bruk.slice(0, HUT_NEARBY.maxCards),
  };
}

export type NearbyHutsResult =
  | { status: "ok"; radiusM: number; count: number; capped: boolean; cards: Hut[] }
  | { status: "unavailable" };

export async function getHutsNear(params: { lat: number; lng: number }): Promise<NearbyHutsResult> {
  try {
    const rows = await hutRpc("huts_near", {
      lat: params.lat,
      lng: params.lng,
      radius_m: HUT_NEARBY.radiusStepsM[HUT_NEARBY.radiusStepsM.length - 1],
      max_results: HUT_NEARBY.fetchLimit,
    });
    if (rows === null) return { status: "unavailable" };
    return { status: "ok", ...selectNearbyHuts(z.array(rowSchema).parse(rows).map(toHut)) };
  } catch (error) {
    console.error("[hytter] huts_near feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

export interface HutBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type HutListResult =
  | { status: "ok"; huts: Hut[]; total: number; truncated: boolean }
  | { status: "unavailable" };

/** Hytter i et kartutsnitt. `total` er antallet i utsnittet, også når listen er kuttet. */
export async function getHutsInBbox(bbox: HutBbox, filters?: HutFilters, limit = 2000): Promise<HutListResult> {
  try {
    const args = {
      min_lng: bbox.minLng,
      min_lat: bbox.minLat,
      max_lng: bbox.maxLng,
      max_lat: bbox.maxLat,
      ...filterArgs(filters),
      max_results: limit,
    };
    const rows = await hutRpc("huts_in_bbox", args);
    if (rows === null) return { status: "unavailable" };
    const parsed = z.array(rowSchema).parse(rows);
    const total = parsed[0]?.total ?? 0;
    // Hele landet er flere hytter enn API-et gir i ett svar. Funksjonen sorterer på navn og ID,
    // så resten kan hentes side for side uten hull eller dubletter.
    const ønsket = Math.min(total, limit);
    while (parsed.length < ønsket && parsed.length % API_PAGE === 0) {
      const neste = await hutRpc("huts_in_bbox", args, parsed.length);
      if (!neste || neste.length === 0) break;
      parsed.push(...z.array(rowSchema).parse(neste));
    }
    return { status: "ok", huts: parsed.map(toHut), total, truncated: total > parsed.length };
  } catch (error) {
    console.error("[hytter] huts_in_bbox feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

export async function getHutsInMunicipality(municipalityNumber: string, filters?: HutFilters): Promise<HutListResult> {
  try {
    const rows = await hutRpc("huts_in_municipality", { p_municipality_number: municipalityNumber, ...filterArgs(filters) });
    if (rows === null) return { status: "unavailable" };
    const huts = z.array(rowSchema).parse(rows).map(toHut);
    return { status: "ok", huts, total: huts.length, truncated: false };
  } catch (error) {
    console.error("[hytter] huts_in_municipality feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

/**
 * Er hyttekategorien publisert for alle? Spør uten innlogging, så svaret er det samme for
 * alle besøkende: en innlogget admin ser hyttene før lansering, men forsiden skal ikke lenke
 * til dem før de er offentlige. Feil gir `false` — da vises ingen lenke.
 */
export async function hutsArePublic(db?: Db | null): Promise<boolean> {
  try {
    const kilde = db === undefined ? await getReadDb() : db;
    if (!kilde) return false;
    const { minLng, minLat, maxLng, maxLat } = HUT_BOUNDS;
    const rows = await kilde.rpc("huts_in_bbox", { min_lng: minLng, min_lat: minLat, max_lng: maxLng, max_lat: maxLat, max_results: 1 });
    return rows.length > 0;
  } catch {
    return false;
  }
}

const indexRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  hut_type: z.enum(HUT_TYPES).catch("unknown"),
  municipality_number: z.string().nullable(),
});

/**
 * Den lette hytteindeksen (`hut_index`): id, navn, type og kommune for hver hytte en anonym
 * besøkende kan se, uten de som ikke er for allmennheten. Leser anonymt, som hyttesiden, og
 * henter i sider på 1 000 (API-ets grense), sortert på navn og ID. Feil kastes.
 */
async function hutIndex(municipalities: string[] | null, db?: Db | null): Promise<IndexHut[]> {
  const kilde = db === undefined ? await getReadDb() : db;
  if (!kilde) return [];
  const ut: IndexHut[] = [];
  for (let fra = 0; fra < 5000; fra += API_PAGE) {
    const side = await kilde.rpc<unknown>("hut_index", { p_municipalities: municipalities }, { range: [fra, fra + API_PAGE - 1] });
    ut.push(...z.array(indexRowSchema).parse(side).map((r) => ({ id: r.id, name: r.name, type: r.hut_type, municipalityNumber: r.municipality_number })));
    if (side.length < API_PAGE) break;
  }
  return ut;
}

/**
 * Alle hytter en anonym besøkende kan se, til sitemapen: ID, navn og kommune. Spør uten
 * innlogging, så avviste, skjulte og upubliserte hytter aldri kommer med — er kategorien ikke
 * publisert, er lista tom. Hytter som ikke er for allmennheten (`not_public`) har en side, men
 * promoteres ikke.
 */
export async function listPublicHuts(db?: Db | null): Promise<{ id: string; name: string; municipalityNumber: string | null }[]> {
  return (await hutIndex(null, db)).map(({ id, name, municipalityNumber }) => ({ id, name, municipalityNumber }));
}

/** Antall offentlige hytter per kommunenummer. Leser anonymt. */
async function municipalityCounts(): Promise<{ municipalityNumber: string | null; huts: number }[]> {
  const db = await getReadDb();
  if (!db) return [];
  const rows = await db.rpc<{ municipality_number: string | null; huts: number }>("hut_municipality_counts");
  return rows.map((r) => ({ municipalityNumber: r.municipality_number, huts: Number(r.huts) }));
}

/** Taggen for alt som teller eller lister hytter på tvers av sider. Tømmes av /admin/hytter. */
export const HUT_OVERVIEW_TAG = "hytter-oversikt";

/**
 * Hytter per fylke, til oversikten på /hytter. `/hytter` er dynamisk (adressen bærer kartets
 * tilstand), så tellingen caches for seg: én spørring i timen, ikke én per besøk.
 */
const cachedMunicipalityCounts = unstable_cache(municipalityCounts, ["hut-municipality-counts"], {
  revalidate: 3600,
  tags: [HUT_OVERVIEW_TAG],
});

export async function getHutCountyOverview(): Promise<{ counties: CountyCount[]; withoutCounty: number } | null> {
  try {
    const [rows, register] = await Promise.all([cachedMunicipalityCounts(), municipalityNames()]);
    return countyCounts(rows, register);
  } catch (error) {
    console.error("[hytter] fylkesoversikten feilet:", error instanceof Error ? error.name : "ukjent");
    return null;
  }
}

/**
 * Hyttene i ett fylke, gruppert per kommune. Én spørring: fylkets kommunenummer sendes som
 * liste. `null` når slugen ikke er et fylke. Feil kastes, så siden ikke caches halv.
 */
export async function getCountyHuts(slug: string): Promise<CountyListing | null> {
  const register = await municipalityNames();
  const fylke = findCounty(slug, register);
  if (!fylke) return null;
  return groupCountyHuts(fylke.county, await hutIndex(fylke.municipalities), register);
}

/** Navnesøk. Returnerer hele hytta, slik at et treff kan vises uten et oppslag til. */
export async function searchHuts(q: string): Promise<Hut[] | null> {
  try {
    const rows = await hutRpc("huts_search", { q, max_results: 20 });
    if (rows === null) return null;
    return z.array(rowSchema).parse(rows).map(toHut);
  } catch (error) {
    console.error("[hytter] huts_search feilet:", error instanceof Error ? error.name : "ukjent");
    return null;
  }
}

/** Andre hytter som vises på en hytteside. */
export const HUT_NEIGHBOURS = { count: 5, radiusM: 30_000 } as const;

export type HutDetailResult =
  | { status: "ok"; hut: Hut; /** De nærmeste andre hyttene, med avstand fra denne. */ nearby: Hut[] }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Én hytte, slått opp på de åtte første tegnene i uuid-en (se lib/huts/href.ts).
 *
 * Leser anonymt (se `publicHutRpc`): hyttesiden er den samme for alle og caches. Alt på siden
 * kommer fra databasen eller et register med reserve, så samme hytte gir samme side hver gang.
 * Svarer ikke databasen — heller ikke for nabohyttene — er svaret `unavailable`, ikke en
 * halv side som blir liggende i cachen.
 */
export async function getHut(ref: string): Promise<HutDetailResult> {
  try {
    const rows = await publicHutRpc("get_hut", { p_ref: ref });
    if (rows === null) return { status: "unavailable" };
    const huts = z.array(rowSchema).parse(rows).map(toHut);
    // To hytter med samme åtte tegn er usannsynlig, men da gjetter vi ikke hvilken som menes.
    if (huts.length !== 1) return { status: "not_found" };
    const [[hut], nearby] = await Promise.all([withMunicipalityNames(huts), nearestHuts(huts[0]!)]);
    return { status: "ok", hut: { ...hut!, elevationM: huts[0]!.elevationM ?? null }, nearby };
  } catch (error) {
    console.error("[hytter] get_hut feilet:", error instanceof Error ? error.name : "ukjent");
    return { status: "unavailable" };
  }
}

/** Naboene til en hytte: de nærmeste, uten hytta selv. Radene kommer sortert på avstand. */
export function selectNeighbourHuts(nearest: Hut[], selfId: string): Hut[] {
  return nearest.filter((other) => other.id !== selfId).slice(0, HUT_NEIGHBOURS.count);
}

/** De nærmeste andre hyttene. Rene naboer i luftlinje — ingen rangering utover avstand. */
async function nearestHuts(hut: Hut): Promise<Hut[]> {
  const rows = await publicHutRpc("huts_near", {
    lat: hut.lat,
    lng: hut.lng,
    radius_m: HUT_NEIGHBOURS.radiusM,
    max_results: HUT_NEIGHBOURS.count + 1,
  });
  return selectNeighbourHuts(z.array(rowSchema).parse(rows ?? []).map(toHut), hut.id);
}

/** Setter kommunenavn på hyttene. Svarer ikke registeret, står navnet tomt. */
export async function withMunicipalityNames(huts: Hut[]): Promise<Hut[]> {
  if (huts.every((hut) => !hut.municipalityNumber)) return huts;
  const names = await municipalityNames();
  return huts.map((hut) => ({
    ...hut,
    municipalityName: hut.municipalityNumber ? (names.get(hut.municipalityNumber)?.name ?? null) : null,
    countyName: hut.municipalityNumber ? (names.get(hut.municipalityNumber)?.county ?? null) : null,
  }));
}
