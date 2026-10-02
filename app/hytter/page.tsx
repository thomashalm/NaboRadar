import type { Metadata } from "next";
import { z } from "zod";
import { AreaShell } from "@/components/area/AreaShell";
import { HutExplorer } from "@/components/huts/HutExplorer";
import { hutOriginName } from "@/lib/huts/wording";
import { getMapTileConfig } from "@/lib/map/config";

/**
 * Hytter og koier i kart.
 *
 * Samme datasett som «Friluft i nærheten» på områdesiden, men utforsket i kart: flytt
 * utsnittet, filtrer på type og eier, søk på navn. Siden er noindex så lenge datasettet er en
 * pilot — den dekker Oslomarka, og skal ikke framstå som en oversikt over hele landet.
 */
export const metadata: Metadata = {
  title: "Hytter og koier",
  description: "Turisthytter, ubetjente hytter og rastebuer i kart.",
  robots: { index: false, follow: true },
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

export default async function HutsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const sted = paramsSchema.safeParse({ lat: raw.lat, lng: raw.lng });
  const hytte = z.uuid().safeParse(raw.hytte);
  const fra = fraSchema.safeParse(raw.fra);
  const radius = radiusSchema.safeParse(raw.radius);

  return (
    <AreaShell>
      <HutExplorer
        tiles={getMapTileConfig()}
        center={sted.success ? sted.data : null}
        originName={sted.success && fra.success ? hutOriginName(fra.data) : null}
        radiusM={radius.success ? radius.data * 1000 : null}
        initialHutId={hytte.success ? hytte.data : null}
      />
    </AreaShell>
  );
}
