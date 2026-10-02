import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getHutsInBbox, getHutsInMunicipality, searchHuts, withMunicipalityNames, type Hut } from "@/lib/huts/queries";
import { HUT_OWNER_KINDS, HUT_TYPES } from "@/lib/huts/types";

/**
 * Hytter og koier til kartet.
 *
 * Tre måter å spørre på, én om gangen:
 *   ?bbox=vest,sør,øst,nord   hyttene i et kartutsnitt
 *   ?kommune=0301             hyttene i en kommune
 *   ?q=kobberhaug             navnesøk
 * `type` og `eier` kan gjentas og snevrer inn de to første.
 *
 * Ruten er en tynn mellommann: grensene på utsnitt og antall håndheves i databasen, og
 * ingenting returneres før kategorien er publisert (eller kalleren er innlogget admin).
 */
export type HutApiResponse =
  | { huts: Hut[]; total: number; truncated: boolean }
  | { hits: Hut[] }
  | { error: "invalid_query" | "unavailable" };

const liste = <T extends string>(verdier: readonly T[]) =>
  z.array(z.enum(verdier as readonly [T, ...T[]])).max(verdier.length);

const filterSchema = z.object({ types: liste(HUT_TYPES), owners: liste(HUT_OWNER_KINDS) });

const bboxSchema = z
  .string()
  .transform((value) => value.split(",").map(Number))
  .pipe(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90)]))
  .refine(([vest, sør, øst, nord]) => vest < øst && sør < nord);

const ugyldig = () => NextResponse.json<HutApiResponse>({ error: "invalid_query" }, { status: 400 });
const nede = () => NextResponse.json<HutApiResponse>({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
// Svaret avhenger av om kalleren er innlogget admin (pilotfasen), så det caches bare privat.
const OK = { headers: { "Cache-Control": "private, max-age=300" } } as const;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = filterSchema.safeParse({ types: params.getAll("type"), owners: params.getAll("eier") });
  if (!filters.success) return ugyldig();

  const q = params.get("q");
  if (q !== null) {
    const parsed = z.string().trim().min(2).max(60).safeParse(q);
    if (!parsed.success) return ugyldig();
    const hits = await searchHuts(parsed.data);
    return hits === null ? nede() : NextResponse.json<HutApiResponse>({ hits: await withMunicipalityNames(hits) }, OK);
  }

  const kommune = params.get("kommune");
  if (kommune !== null) {
    if (!/^\d{4}$/.test(kommune)) return ugyldig();
    const resultat = await getHutsInMunicipality(kommune, filters.data);
    if (resultat.status !== "ok") return nede();
    return NextResponse.json<HutApiResponse>({ huts: await withMunicipalityNames(resultat.huts), total: resultat.total, truncated: resultat.truncated }, OK);
  }

  const bbox = bboxSchema.safeParse(params.get("bbox") ?? "");
  if (!bbox.success) return ugyldig();
  const [minLng, minLat, maxLng, maxLat] = bbox.data;
  const resultat = await getHutsInBbox({ minLng, minLat, maxLng, maxLat }, filters.data);
  if (resultat.status !== "ok") return nede();
  return NextResponse.json<HutApiResponse>({ huts: await withMunicipalityNames(resultat.huts), total: resultat.total, truncated: resultat.truncated }, OK);
}
