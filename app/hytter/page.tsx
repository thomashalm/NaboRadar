import type { Metadata } from "next";
import { z } from "zod";
import { AreaShell } from "@/components/area/AreaShell";
import { HutExplorer } from "@/components/huts/HutExplorer";
import { hutRefFromSlug } from "@/lib/huts/href";
import { getHut } from "@/lib/huts/queries";
import { hutOriginName } from "@/lib/huts/wording";
import { getMapTileConfig } from "@/lib/map/config";

/**
 * Hytter og koier i kart.
 *
 * Samme datasett som «Friluft i nærheten» på områdesiden, men utforsket i kart: flytt
 * utsnittet, filtrer på type og eier, søk på hytte eller sted. Datasettet dekker hele landet.
 *
 * Indekseres. Adresser med `lat`/`lng`/`hytte` er samme side med et annet startutsnitt, så
 * canonical peker alltid på /hytter.
 */
export const metadata: Metadata = {
  title: "Hytter og koier i Norge",
  description:
    "Kart over turisthytter, ubetjente hytter, koier og rastebuer i hele Norge, fra Kartverket. Søk etter hytte eller sted, og se hvem som driver hytta og hvor du bestiller.",
  alternates: { canonical: "/hytter" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const paramsSchema = z.object({
  // Samme grenser som resten av appen: Fastlands-Norge med margin.
  lat: z.coerce.number().min(57).max(72),
  lng: z.coerce.number().min(4).max(32),
});
/** Navnet på stedet `lat`/`lng` er. Bare med det vises avstander — se `hutOriginName`. */
const fraSchema = z.string().trim().min(1).max(120);
/** Hvor langt ut kartet viser fra start, i km. Følger radien hyttene ble talt opp i. */
const radiusSchema = z.coerce.number().int().min(1).max(50);

/** Utsnittet rundt en hytte som er valgt i adressen, uten noe annet startpunkt. */
const VALGT_HYTTE_RADIUS_M = 3_000;

/**
 * `hytte` er valgt hytte. To former:
 *   - `aursjobu-a4fbf722`, samme nøkkel som hyttesiden. Det er den kartet selv skriver når en
 *     hytte velges. Uten `lat`/`lng` slås hytta opp, og kartet starter rundt den.
 *   - full uuid, sammen med `lat`/`lng` (eldre lenker, og «Se i kart» fra hyttesiden).
 * Adressen er fortsatt bare kartet: canonical er /hytter uansett, og hyttesiden er detaljsiden.
 */
async function valgtHytte(param: unknown): Promise<{ id: string; lat: number; lng: number } | null> {
  if (typeof param !== "string") return null;
  const ref = hutRefFromSlug(param);
  if (!ref) return null;
  const resultat = await getHut(ref);
  return resultat.status === "ok" ? { id: resultat.hut.id, lat: resultat.hut.lat, lng: resultat.hut.lng } : null;
}

export default async function HutsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const sted = paramsSchema.safeParse({ lat: raw.lat, lng: raw.lng });
  const uuid = z.uuid().safeParse(raw.hytte);
  const fra = fraSchema.safeParse(raw.fra);
  const radius = radiusSchema.safeParse(raw.radius);
  const hytte = uuid.success ? null : await valgtHytte(raw.hytte);
  // Et oppgitt startpunkt går foran: det er det avstandene måles fra.
  const center = sted.success ? sted.data : hytte ? { lat: hytte.lat, lng: hytte.lng } : null;

  return (
    <AreaShell>
      <HutExplorer
        tiles={getMapTileConfig()}
        center={center}
        originName={sted.success && fra.success ? hutOriginName(fra.data) : null}
        radiusM={radius.success ? radius.data * 1000 : !sted.success && hytte ? VALGT_HYTTE_RADIUS_M : null}
        initialHutId={uuid.success ? uuid.data : (hytte?.id ?? null)}
      />
    </AreaShell>
  );
}
