import "server-only";
import type { MultiPolygon, Point, Polygon } from "geojson";
import { DOCUMENT_TYPE_LABELS } from "@/lib/events/labels";
import { formaalFor, STATUS_FORBEHOLD, tiltakLabel } from "@/lib/plans/visning";
import { municipalityNames } from "@/lib/geo/municipalities";
import { dato, rader, tall, tekst } from "./area-features";
import type { EventAttributes } from "@/types/event";
import { PLANSAK_OVERLAPP, plansakOverlapp, type OverlappTreff } from "./plansak-overlapp";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Plansaker i Utforsk data: varsler om planoppstart fra DiBKs fellestjeneste.
 *
 * Samme saker som «Planer og saker» på `/omrade`, men spurt etter område og ikke etter avstand
 * fra én adresse. Tiltakstype og formål kommer fra det deterministiske uttrekket (ADR 016), og
 * formålet er alltid et ordrett sitat fra saksdokumentene — eller fraværende.
 *
 * KILDEN SIER BARE AT PLANARBEID ER VARSLET. Den sier ikke om planen senere er vedtatt, endret
 * eller lagt bort, og panelet sier det. Vi viser ingen status vi ikke har.
 */
interface Rad {
  id: string;
  title: string;
  type: string;
  municipality_number: string | null;
  announced_at: string | null;
  source_url: string | null;
  area_m2: number | null;
  attributes: EventAttributes;
  documents: { type: string | null; title: string | null; url: string | null; date: string | null }[];
  geometry: Polygon | MultiPolygon;
  center: Point;
  total: number;
}

/** En plansak fra `explore_events_overlap`: samme rad, pluss det den traff. */
interface Overlapprad extends Rad {
  hits: OverlappTreff[] | null;
  hit_count: number;
  area_total: number;
  edge_only: number;
}

/** Taket per kall. Nyeste varsel først; de eldste faller ut når det nås. */
const LIMIT = 800;

export const plansakerDataset: ExploreDataset = {
  id: "plansaker",
  label: "Plansaker",
  unit: { one: "plansak", many: "plansaker" },
  aliases: ["plan", "planer", "plansak", "plansaker", "planoppstart", "planoppstarter", "reguleringsplan", "reguleringsplaner", "planarbeid"],
  needsArea: true,
  policy: { openMap: "ja", omrade: "ja" },
  description: `Varslede planoppstarter fra DiBK. ${STATUS_FORBEHOLD}`,

  async load(client, area) {
    if (!area) return { features: [], total: 0, error: null };
    const [{ data, error }, kommuner] = await Promise.all([
      client.rpc("explore_events", {
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
    const alle = (data ?? []) as Rad[];
    return {
      features: alle.map((rad) => plansakFeature(rad, kommuner.get(rad.municipality_number ?? "")?.name ?? null)),
      total: Number(alle[0]?.total ?? 0),
      error: null,
    };
  },

  overlap: {
    refs: PLANSAK_OVERLAPP,
    async load(client, area, refId) {
      const tom = { features: [], total: 0, areaTotal: 0, edgeOnly: 0 };
      const [{ data, error }, kommuner] = await Promise.all([
        client.rpc("explore_events_overlap", {
          p_ref: refId,
          p_min_lng: area.box.minLng,
          p_min_lat: area.box.minLat,
          p_max_lng: area.box.maxLng,
          p_max_lat: area.box.maxLat,
          p_area: area.polygon,
          p_limit: LIMIT,
        }),
        municipalityNames(),
      ]);
      if (error) return { ...tom, error: error.message };
      const alle = (data ?? []) as Overlapprad[];
      if (alle.length === 0) {
        // Ingen treff sier ikke hvor mange plansaker som finnes. Det spør vi om for seg, så
        // «0 av 53» blir riktig — og «0 av 0» ikke forveksles med «ingen overlapper».
        const { data: liste, error: feil } = await client.rpc("explore_events", {
          p_min_lng: area.box.minLng,
          p_min_lat: area.box.minLat,
          p_max_lng: area.box.maxLng,
          p_max_lat: area.box.maxLat,
          p_area: area.polygon,
          p_limit: 1,
        });
        if (feil) return { ...tom, error: feil.message };
        return { ...tom, areaTotal: Number((liste as { total: number }[] | null)?.[0]?.total ?? 0), error: null };
      }
      return {
        features: alle.map((rad) => plansakOverlappFeature(rad, kommuner.get(rad.municipality_number ?? "")?.name ?? null, refId)),
        total: Number(alle[0]!.total),
        areaTotal: Number(alle[0]!.area_total),
        edgeOnly: Number(alle[0]!.edge_only),
        error: null,
      };
    },
  },
};

/** Plansaken som vanlig, med analysen lagt ved siden av — ikke blandet inn i kildens felt. Eksportert for test. */
export function plansakOverlappFeature(rad: Overlapprad, kommune: string | null, refId: string): Omit<ExploreFeature, "datasetId" | "datasetLabel"> {
  const feature = plansakFeature(rad, kommune);
  const overlapp = plansakOverlapp(refId, rad.hits ?? [], rad.hit_count);
  if (!overlapp) return feature;
  return { ...feature, summary: [overlapp.summary, feature.summary].filter(Boolean).join(" · "), analysis: overlapp.analysis };
}

const PROPOSER: Record<string, string> = { Foretak: "foretak", Kommune: "kommune", Privatperson: "privatperson", Stat: "statlig", Fylkeskommune: "fylkeskommune" };

/** Eksportert for test. */
export function plansakFeature(rad: Rad, kommune: string | null): Omit<ExploreFeature, "datasetId" | "datasetLabel"> {
  const tiltak = tiltakLabel({ title: rad.title, attributes: rad.attributes });
  const formaal = formaalFor({ attributes: rad.attributes });
  const varslet = dato(rad.announced_at);
  const areal = tall(rad.area_m2);
  const forslagsstiller = tekst(rad.attributes.proposerType);
  const dokumenter = rad.documents.filter((d) => d.url && /^https?:\/\//.test(d.url));

  return {
    id: rad.id,
    title: rad.title,
    kind: "Varslet planoppstart",
    style: "plansak",
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: kommune,
    summary: [tiltak, varslet ? `varslet ${varslet}` : null].filter(Boolean).join(" · "),
    details: rader([
      { label: "Tiltakstype", value: tiltak },
      // Formålet er et sitat. Finnes det ikke, står det ikke noe — vi oppsummerer ikke selv.
      formaal ? { label: "Formål", value: `«${formaal}»` } : null,
      tekst(rad.attributes.plantype) ? { label: "Plantype", value: tekst(rad.attributes.plantype)! } : null,
      forslagsstiller ? { label: "Forslagsstiller", value: PROPOSER[forslagsstiller] ?? forslagsstiller.toLowerCase() } : null,
      varslet ? { label: "Varslet", value: varslet } : null,
      kommune ? { label: "Kommune", value: kommune } : null,
      areal !== null && areal > 0 ? { label: "Planområde", value: `${Math.round(areal).toLocaleString("nb-NO")} m²` } : null,
      tekst(rad.attributes.planId) ? { label: "Plan-ID", value: tekst(rad.attributes.planId)! } : null,
      { label: "Dokumenter", value: dokumenter.length === 0 ? "ingen i kilden" : String(dokumenter.length) },
    ]),
    links: dokumenter.map((d) => ({
      // Kildens typekoder («ref-data-as-pdf») vises aldri rått: kjent type får navn, ukjent blir «Dokument».
      label: [(d.type && DOCUMENT_TYPE_LABELS[d.type]) ?? "Dokument", tekst(d.title), dato(d.date)].filter(Boolean).join(" · "),
      url: d.url!,
    })),
    explanation: STATUS_FORBEHOLD,
    notice: null,
    sourceName: "Planlegging igangsatt (DiBK)",
    sourceUrl: rad.source_url,
    href: `/sak/${rad.id}`,
    hrefLabel: "Åpne saken",
  };
}
