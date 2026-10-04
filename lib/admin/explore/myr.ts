import "server-only";
import { municipalityNames } from "@/lib/geo/municipalities";
import { MULTE_BOKS, MULTE_DEKNING } from "@/lib/multe/omrade";
import { dato, rader, tall, tekst, type AreaFeatureRad } from "./area-features";
import { INTERNT } from "./multefunn";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Myr i Utforsk data: myrflater fra Kartverkets N50, Oslo og Marka. Internt researchlag.
 *
 * N50 er 1:50 000. Små myrer mangler, og kartet sier ikke hva slags myr det er. Det er det åpne
 * kartet vi har lov til å lagre; FKB-AR5 er ikke åpne data og brukes ikke.
 *
 * For hver myr viser panelet registrerte multefunn i nærheten: antall innen 500 m, og avstanden
 * til det nærmeste. Det er OBSERVASJONSKONTEKST — hvor noen har registrert planten — og ikke en
 * sannsynlighet eller en vurdering av myra. En myr uten funn i nærheten kan like gjerne være en
 * myr ingen har registrert noe på. Ingen score. Se docs/research/multer-oslo.md.
 */
interface Myrrad extends AreaFeatureRad {
  area_m2: number | null;
  finds_500: number;
  nearest_m: number | null;
  nearest_id: string | null;
  nearest_year: number | null;
}

export const FUNN_RADIUS_M = 500;
export const NAERMESTE_MAKS_M = 2000;
export const KONTEKST_FORBEHOLD =
  "Observasjonskontekst: hvor noen har registrert planten. Ikke en sannsynlighet og ikke en vurdering av myra — en myr uten funn kan være en myr ingen har registrert noe på.";

const LIMIT = 1500;

export const myrDataset: ExploreDataset = {
  id: "myr",
  label: "Myr",
  unit: { one: "myrflate", many: "myrflater" },
  aliases: ["myr", "myrer", "myrflate", "myrflater", "myrområder"],
  needsArea: true,
  policy: { openMap: "nei", omrade: "nei" },
  coverage: { label: MULTE_DEKNING, box: MULTE_BOKS },
  description: `Myrflater fra Kartverkets N50 (1:50 000). Små myrer mangler. Dekker bare ${MULTE_DEKNING}. Internt researchlag.`,

  async load(client, area) {
    if (!area) return { features: [], total: 0, error: null };
    const [{ data, error }, kommuner] = await Promise.all([
      client.rpc("explore_mires", {
        p_min_lng: area.box.minLng,
        p_min_lat: area.box.minLat,
        p_max_lng: area.box.maxLng,
        p_max_lat: area.box.maxLat,
        p_area: area.polygon,
        p_limit: LIMIT,
      }),
      municipalityNames(),
    ]);
    if (error) return { features: [], total: 0, error: error.message };
    const alle = (data ?? []) as Myrrad[];
    return {
      features: alle.map((rad) => myrFeature(rad, kommuner.get(tekst(rad.attributes.municipality_number) ?? "")?.name ?? null)),
      total: Number(alle[0]?.total ?? 0),
      error: null,
    };
  },
};

const meter = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} km`);
const areal = (m2: number) => (m2 < 10_000 ? `${(Math.round(m2 / 100) / 10).toLocaleString("nb-NO")} dekar` : `${Math.round(m2 / 1000).toLocaleString("nb-NO")} dekar`);

/** Eksportert for test. */
export function myrFeature(rad: Myrrad, kommune: string | null): Omit<ExploreFeature, "datasetId" | "datasetLabel"> {
  const m2 = tall(rad.area_m2);
  const innen = rad.finds_500 ?? 0;
  const naermeste = tall(rad.nearest_m);
  const paaMyra = naermeste !== null && naermeste < 1;
  // Under ti meter fra flaten: kartet er 1:50 000 og funnet har egen usikkerhet. «0 m» ville lovet for mye.
  const iKanten = naermeste !== null && !paaMyra && naermeste < 10;

  const antall = `${innen} ${innen === 1 ? "registrert multefunn" : "registrerte multefunn"} innen ${FUNN_RADIUS_M} m`;
  const naer =
    naermeste === null
      ? `Ingen registrerte funn innen ${NAERMESTE_MAKS_M / 1000} km`
      : paaMyra
        ? "Nærmeste registrerte funn: på myra"
        : iKanten
          ? "Nærmeste registrerte funn: i myrkanten"
          : `Nærmeste registrerte funn: ${meter(naermeste)}`;

  return {
    id: rad.id,
    title: m2 !== null ? `Myr, ${areal(m2)}` : "Myr",
    kind: "Myrflate",
    style: "myr",
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: kommune,
    summary: innen > 0 ? antall : naer,
    details: rader([
      m2 !== null ? { label: "Areal", value: areal(m2) } : null,
      kommune ? { label: "Kommune", value: kommune } : null,
      dato(rad.source_updated_at) ? { label: "Sist oppdatert i kilden", value: dato(rad.source_updated_at)! } : null,
    ]),
    analysis: {
      label: "Registrerte multefunn i nærheten",
      heading: antall,
      lines: [`${naer}.`],
      // Funnet kan åpnes fra panelet når funnlaget er aktivt.
      items: rad.nearest_id && naermeste !== null ? [{ id: rad.nearest_id, title: "Nærmeste funn", lines: [[paaMyra ? "på myra" : iKanten ? "i myrkanten" : `${meter(naermeste)} unna`, rad.nearest_year ? `registrert ${rad.nearest_year}` : null].filter(Boolean).join(", ")] }] : [],
      more: 0,
      note: KONTEKST_FORBEHOLD,
    },
    explanation: "Flaten er fra et kart i 1:50 000. Små myrer mangler, og kartet sier ikke hva slags myr det er.",
    notice: INTERNT,
    sourceName: "N50 Kartdata (Kartverket, CC BY 4.0)",
    sourceUrl: rad.source_url,
    href: null,
    hrefLabel: null,
  };
}
