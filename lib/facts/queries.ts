import { z } from "zod";
import { TtlCache } from "@/lib/cache";
import { getDbMode, getReadDb } from "@/lib/db";
import { formatDistance, formatRadius } from "@/lib/format";
import {
  AREA_CATEGORIES,
  AREA_SECTIONS,
  sectionOrder,
  type AreaCategory,
  type AreaFact,
  type AreaFeatureHit,
  type AreaGeometry,
  type AreaSection,
} from "@/types/area-feature";
import { areaLookups } from "./lookups";
import type { LookupHit } from "./lookups/types";
import {
  ANLEGG_TYPE_LABEL,
  describeAnleggSummary,
  describeClusterSummary,
  describeClusterToggle,
  describePlaceLine,
  HELSE_CAVEAT,
  OPPVEKST_CAVEAT,
  SERVERING_CAVEAT,
  describeContaminatedGroupSummary,
  describeContaminatedSummary,
  describeFact,
  describeMapLines,
  INGEN_FORURENSNING_TIL_OPPFOLGING,
  linkLabelFor,
  OPPVEKST_TYPE_LABEL,
  PAAVIRKNINGSGRAD_SHORT,
  SOURCES,
  type SourceInfo,
} from "./wording";

/**
 * Setter sammen «Hva bør du vite om området?»:
 *  1. synkede fakta fra PostGIS (features_near)
 *  2. direkte oppslag mot kilder som er for store til synk (lib/facts/lookups)
 *
 * All tekst hentes fra formuleringsregisteret. Er en kilde nede, vises resten.
 */

/** Geometrien fra features_near. Struktur valideres, innhold ikke. */
const geometrySchema = z
  .object({
    type: z.enum(["Point", "Polygon", "MultiPolygon", "LineString", "MultiLineString"]),
    coordinates: z.array(z.unknown()).min(1),
  })
  .transform((g) => g as unknown as AreaGeometry);

const rowSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  external_id: z.string(),
  category: z.enum(AREA_CATEGORIES),
  subtype: z.string(),
  title: z.string(),
  distance_m: z.number(),
  contains: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  source_url: z.string().nullable(),
  source_url_type: z.enum(["provider_page", "factsheet", "report"]).nullable(),
  source_updated_at: z.string().nullable(),
  centroid: geometrySchema.nullable(),
  geometry: geometrySchema.nullable(),
});

type FactRow = z.infer<typeof rowSchema>;

/** Én rad i en «Se alle …»-liste. */
export interface OverviewItem {
  id: string;
  title: string;
  distanceLabel: string;
  /** Kort, nøytral undertekst — myndighetens vurdering, anleggstype e.l. */
  subtitle: string;
  contains: boolean;
  href: string | null;
}

/**
 * Utvidbar oversikt for en seksjon: alt kilden har i området, også det som ikke
 * fortjener et eget kort. Samme form uansett datatype, slik at nye typer ikke
 * trenger ny UI-logikk.
 */
export interface SectionOverview {
  sectionId: string;
  /** Tekst på selve utvideren, f.eks. «Se alle registreringer i området». */
  toggleLabel: string;
  total: number;
  /** Settes når ingenting i seksjonen ble løftet til et hovedkort. */
  noAttentionNote: string | null;
  headline: string;
  details: string[];
  caveat: string | null;
  sourceName: string;
  items: OverviewItem[];
}

/**
 * Én liste over samme stedstype inne i en gruppe, f.eks. «Skoler». Listen inneholder alle
 * stedene, sortert nærmest først; UI-et viser `previewCount` av dem og resten bak utvideren.
 */
export interface ClusterList {
  id: string;
  label: string;
  /** Tekst på utvideren for resten, f.eks. «Se alle skoler (12)». Null når alle vises. */
  toggleLabel: string | null;
  items: OverviewItem[];
  previewCount: number;
  /** Hvor mange kilden har i området. Kan være flere enn `items` når listen er kuttet. */
  total: number;
}

/**
 * En gruppe av relaterte stedstyper inne i en seksjon. Kompakt til den utvides, slik at
 * mange nesten like steder ikke skyver resten av siden nedover. Nye typer legges til som
 * nye lister, uten ny UI-logikk.
 */
export interface FactCluster {
  sectionId: string;
  id: string;
  label: string;
  /** Antall per undertype, f.eks. «2 skoler · 7 barnehager innen 1 km». */
  summary: string;
  /** Hovedfunn som fortjener et helt kort, vist øverst når gruppen åpnes. */
  facts: AreaFact[];
  lists: ClusterList[];
  /** Alt kilden har i området, bak en egen utvider inne i gruppen. */
  overview: SectionOverview | null;
  caveat: string | null;
  sourceName: string;
}

/** Et objekt som skal tegnes i kartet. Flate eller punkt, avhengig av kilden. */
export interface AreaMapFeature {
  id: string;
  category: AreaCategory;
  title: string;
  geometry: AreaGeometry;
  /** Punkt å plassere popup på. */
  center: [number, number];
  contains: boolean;
  distanceLabel: string;
  /** Ferdig formulerte linjer til popup — fra formuleringsregisteret, aldri satt sammen i UI-et. */
  lines: string[];
  href: string | null;
}

/** En seksjon slik den vises: kort, og eventuelt en utvidbar oversikt. */
export interface AreaFactGroup {
  sectionId: string;
  label: string;
  intro: string | null;
  facts: AreaFact[];
  /** Grupperte stedstyper, vist før enkeltkortene. */
  clusters: FactCluster[];
  overview: SectionOverview | null;
}

export type AreaFactsResult =
  | {
      status: "ok";
      groups: AreaFactGroup[];
      /** Alle seksjoner i visningsrekkefølge, også de uten treff i dette delsvaret. */
      order: readonly string[];
      /** Alt som skal tegnes i kartet, på tvers av seksjoner. */
      mapFeatures: AreaMapFeature[];
      sources: SourceInfo[];
      /** Kilder som ikke svarte. Vises som en nøytral merknad. */
      unavailableSources: string[];
    }
  | { status: "unavailable"; devReason: string };

/** Intern markør for «denne kilden skal ikke hentes nå», så den ikke telles som en feil. */
class SkipSource extends Error {}

/** Direkte oppslag caches kort, slik at bytte av radius ikke gir nye kall mot kildene. */
const lookupCache = new TtlCache<LookupResult[]>(5 * 60 * 1000, 200);
const LOOKUP_BUDGET_MS = 8_000;

interface LookupResult {
  lookupId: string;
  category: AreaCategory;
  hits: LookupHit[];
}

function distanceLabel(distanceM: number | null, contains: boolean): string {
  if (contains) return "Ved søkepunktet";
  return distanceM === null ? "I området" : formatDistance(distanceM);
}

function sourceDateLabel(sourceUpdatedAt: string | null): string | null {
  if (!sourceUpdatedAt) return null;
  const year = new Date(sourceUpdatedAt).getUTCFullYear();
  return Number.isFinite(year) ? `Kildedata oppdatert ${year}` : null;
}

function toFact(input: {
  id: string;
  providerId: string;
  externalId?: string | null;
  category: AreaCategory;
  subtype: string;
  title: string;
  attributes: AreaFeatureHit["attributes"];
  distanceM: number | null;
  contains: boolean;
  sourceUrl: string | null;
  sourceUrlType: AreaFeatureHit["sourceUrlType"];
  sourceUpdatedAt: string | null;
}): AreaFact | null {
  const text = describeFact({
    subtype: input.subtype,
    title: input.title,
    attributes: input.attributes,
    contains: input.contains,
    externalId: input.externalId ?? null,
  });
  if (!text) return null;
  const source = SOURCES[input.providerId];
  return {
    id: input.id,
    category: input.category,
    subtype: input.subtype,
    headline: text.headline,
    details: text.details,
    technical: text.technical ?? [],
    caveat: text.caveat,
    distanceLabel: distanceLabel(input.distanceM, input.contains),
    distanceM: input.distanceM,
    contains: input.contains,
    sourceName: source ? `${source.name} (${source.owner})` : input.providerId,
    sourceDateLabel: sourceDateLabel(input.sourceUpdatedAt),
    link: input.sourceUrl
      ? { href: input.sourceUrl, label: linkLabelFor(input.sourceUrlType, input.providerId) }
      : null,
  };
}

/**
 * Forurenset grunn: bare det brukeren faktisk bør merke seg blir hovedkort.
 *
 * Grad 1 og 2 er myndighetens egen konklusjon om at tilstanden er akseptabel. De skal ikke få
 * et område til å se problematisk ut, og vises derfor ikke som kort — men de finnes fortsatt
 * i «Se alle registreringer i området» og tegnes i kartet som før.
 *
 * Et kort vises når kilden sier at noe må følges opp (grad 3 eller X), eller når søkepunktet
 * faktisk ligger inne i lokaliteten. Det siste handler om stedet brukeren spurte om, og er
 * relevant uansett hvilken grad kilden har satt.
 */
const CONTAMINATED_CARD_LIMIT = 5;
/** Rader per spørring. Holder svaret — og kartpayloaden — begrenset i tette områder. */
const FEATURE_LIMIT = 300;
/** Skjenkesteder hentes for seg: 539 innen 1 km av Karl Johan ville spist hele radgrensen. */
const SERVERING_LIMIT = 150;
/** Hvor mange skjenkesteder kartet tegner. Over dette blir kartet uleselig. */
const SERVERING_MARKER_CAP = 30;
const OTHER_CATEGORIES = AREA_CATEGORIES.filter((c) => c !== "miljo" && c !== "servering");
const GRADES_NEEDING_ATTENTION = new Set(["ikkeAkseptabelForurensning", "ukjentPåvirkning"]);

const byRelevance = (a: FactRow, b: FactRow) => Number(b.contains) - Number(a.contains) || a.distance_m - b.distance_m;

/** Centroiden fra PostGIS som [lng, lat]. */
const toLngLat = (centroid: AreaGeometry | null): [number, number] => {
  const position = centroid?.type === "Point" ? centroid.coordinates : null;
  return position && position.length >= 2 ? [position[0]!, position[1]!] : [0, 0];
};

const gradeOf = (row: FactRow): string =>
  typeof row.attributes.paavirkningsgrad === "string" ? row.attributes.paavirkningsgrad : "ukjentPåvirkning";

const factFromRow = (row: FactRow): AreaFact | null =>
  toFact({
    id: row.id,
    providerId: row.provider_id,
    externalId: row.external_id,
    category: row.category,
    subtype: row.subtype,
    title: row.title,
    attributes: row.attributes,
    distanceM: row.distance_m,
    contains: row.contains,
    sourceUrl: row.source_url,
    sourceUrlType: row.source_url_type,
    sourceUpdatedAt: row.source_updated_at,
  });

/** Ett kartobjekt per rad som har geometri og et punkt å feste popup i. */
const mapFeatureFromRow = (row: FactRow): AreaMapFeature[] =>
  row.geometry && row.centroid?.type === "Point"
    ? [
        {
          id: row.id,
          category: row.category,
          title: row.title,
          geometry: row.geometry,
          center: toLngLat(row.centroid),
          contains: row.contains,
          distanceLabel: distanceLabel(row.distance_m, row.contains),
          lines: describeMapLines({ subtype: row.subtype, attributes: row.attributes }),
          href: row.source_url,
        },
      ]
    : [];

/** Om en registrering fortjener et eget kort, eller bare hører hjemme i oversikten. */
export function needsAttention(input: { contains: boolean; grade: string }): boolean {
  return input.contains || GRADES_NEEDING_ATTENTION.has(input.grade);
}

/** Eksportert for test: hva som løftes fram og hva som telles er produktlogikk. */
export function contaminatedFacts(rows: FactRow[], radiusM: number, truncated = false) {
  const sorted = [...rows].sort(byRelevance);

  const facts = sorted
    .filter((row) => needsAttention({ contains: row.contains, grade: gradeOf(row) }))
    .slice(0, CONTAMINATED_CARD_LIMIT)
    .flatMap((row) => factFromRow(row) ?? []);

  const source = SOURCES["mdir-forurenset-grunn"]!;
  const summary = describeContaminatedSummary({
    total: sorted.length,
    truncated,
    byGrade: ["ikkeAkseptabelForurensning", "ukjentPåvirkning", "akseptabelForurensning", "liteForurensning"].map((grade) => ({
      grade,
      count: sorted.filter((row) => gradeOf(row) === grade).length,
    })),
    radiusLabel: formatRadius(radiusM),
  });

  const overview: SectionOverview = {
    sectionId: "forurenset-grunn",
    toggleLabel: "Se alle registreringer i området",
    total: sorted.length,
    // Sammendraget på gruppen sier allerede dette; det skal ikke stå to ganger.
    noAttentionNote: null,
    headline: summary.headline,
    details: summary.details,
    caveat: summary.caveat,
    sourceName: `${source.name} (${source.owner})`,
    items: sorted.map((row) => ({
      id: row.id,
      title: row.title,
      distanceLabel: distanceLabel(row.distance_m, row.contains),
      subtitle: PAAVIRKNINGSGRAD_SHORT[gradeOf(row)] ?? "uten oppgitt grad",
      contains: row.contains,
      href: row.source_url,
    })),
  };

  // Bare flater tegnes for denne kilden; den har ingen punkter.
  const mapFeatures = sorted
    .filter((row) => row.geometry?.type === "Polygon" || row.geometry?.type === "MultiPolygon")
    .flatMap(mapFeatureFromRow);

  // Gjelder noe av dette adressen selv, og ikke bare nabolaget?
  const affectsSearchPoint = sorted.some(
    (row) => row.contains && GRADES_NEEDING_ATTENTION.has(gradeOf(row)),
  );

  // Seksjonen vises som én kompakt gruppe, som resten av siden. Kortene, «Se alle» og
  // ordlyden er de samme — de ligger bare bak utvideren i stedet for å fylle siden.
  const cluster: FactCluster = {
    sectionId: "forurenset-grunn",
    id: "forurenset-grunn",
    label: "Forurenset grunn",
    summary: describeContaminatedGroupSummary({
      // Grad 1 og 2 er myndighetens konklusjon om at tilstanden er akseptabel, og teller
      // derfor med i totalen, men ikke som oppfølging.
      oppfolging: sorted.filter((row) => GRADES_NEEDING_ATTENTION.has(gradeOf(row))).length,
      total: sorted.length,
      radiusLabel: formatRadius(radiusM),
    }),
    facts,
    lists: [],
    overview,
    caveat: facts.length === 0 ? INGEN_FORURENSNING_TIL_OPPFOLGING : null,
    sourceName: `${source.name} (${source.owner})`,
  };

  return { cluster, mapFeatures, affectsSearchPoint };
}

/**
 * Nærområdet: anlegg med utslippstillatelse.
 *
 * Nøytral presentasjon — vi løfter ikke fram noe som «problem». De nærmeste vises som kort,
 * resten ligger bak «Se alle anlegg i området», og alle tegnes i kartet.
 */
/**
 * Kort per kategori, ikke totalt. Ellers kan seks nære barnehager skyve ut anlegget
 * i nabogata, og seksjonen blir ensidig selv om kartet viser alt.
 */
/** Kategoriene som vises i «Nærområdet» — som kort (industri) eller som gruppe. */
const PLACE_CATEGORIES = new Set<AreaCategory>(["industri", "oppvekst", "helse", "omsorg", "servering"]);

/** Hvor mange steder som vises per undertype før «Se alle …». */
const CLUSTER_PREVIEW = 3;

/** Hvor mange steder en enkelt liste viser bak utvideren. Skjenkesteder er så tette at
 *  «alle» fort er flere hundre; da sier teksten hvor mange av hvor mange vi viser. */
const CLUSTER_LIST_CAP = 30;

interface ClusterListSpec {
  id: string;
  label: string;
  subtypes: readonly string[];
  ental: string;
  flertall: string;
}

/**
 * Gruppene i «Nærområdet». Hver gruppe dekker én lagringskategori og deler den i undertyper.
 * En ny stedstype legges til her — ikke i UI-et.
 */
const CLUSTER_SPECS: readonly {
  id: string;
  label: string;
  categories: readonly AreaCategory[];
  caveat: string;
  /** Vis hvert sted som eget kort i stedet for en kompakt rad. */
  cards?: boolean;
  lists: readonly ClusterListSpec[];
}[] = [
  {
    id: "skoler-og-barnehager",
    label: "Skoler og barnehager",
    categories: ["oppvekst"],
    caveat: OPPVEKST_CAVEAT,
    lists: [
      { id: "skoler", label: "Skoler", subtypes: ["grunnskole", "videregaende_skole"], ental: "skole", flertall: "skoler" },
      { id: "barnehager", label: "Barnehager", subtypes: ["barnehage"], ental: "barnehage", flertall: "barnehager" },
    ],
  },
  {
    id: "helse",
    label: "Helse og omsorg",
    categories: ["helse", "omsorg"],
    caveat: HELSE_CAVEAT,
    lists: [
      { id: "sykehus", label: "Sykehus", subtypes: ["sykehus"], ental: "sykehus", flertall: "sykehus" },
      {
        id: "omsorgstilbud",
        label: "Omsorgstilbud",
        subtypes: ["omsorgstilbud"],
        ental: "omsorgstilbud",
        flertall: "omsorgstilbud",
      },
    ],
  },
  {
    id: "virksomheter-og-anlegg",
    label: "Virksomheter og anlegg",
    categories: ["industri"],
    caveat: "",
    // Anleggene er få, og hvert av dem har egne opplysninger — bransje, utslipp, myndighet.
    cards: true,
    lists: [
      {
        id: "anlegg",
        label: "Anlegg",
        subtypes: ["industrianlegg", "avfallsanlegg"],
        ental: "anlegg",
        flertall: "anlegg",
      },
    ],
  },
  {
    id: "servering",
    label: "Servering og uteliv",
    categories: ["servering"],
    caveat: SERVERING_CAVEAT,
    lists: [
      {
        id: "skjenkesteder",
        label: "Steder med skjenkebevilling",
        subtypes: ["skjenkested"],
        ental: "sted med skjenkebevilling",
        flertall: "steder med skjenkebevilling",
      },
    ],
  },
];

/** Nøytral undertekst per stedstype, brukt i «Se alle»-listen. */
const placeSubtitle = (subtype: string): string =>
  OPPVEKST_TYPE_LABEL[subtype] ?? ANLEGG_TYPE_LABEL[subtype] ?? "Sted i nærområdet";

const overviewItem = (row: FactRow, subtitle: string): OverviewItem => ({
  id: row.id,
  title: row.title,
  distanceLabel: distanceLabel(row.distance_m, row.contains),
  subtitle,
  contains: row.contains,
  href: row.source_url,
});

const sourceNames = (rows: FactRow[]): string =>
  [...new Set(rows.map((row) => row.provider_id))]
    .flatMap((id) => (SOURCES[id] ? [`${SOURCES[id]!.name} (${SOURCES[id]!.owner})`] : []))
    .join(" · ");

/**
 * Én gruppe relaterte stedstyper, f.eks. «Skoler og barnehager». Uten grupperingen fyller
 * noen få nære barnehager — eller tjue skjenkesteder — hele seksjonen og skyver resten ut av
 * standardvisningen. Undertyper uten treff får ingen tom overskrift.
 */
function buildCluster(
  spec: (typeof CLUSTER_SPECS)[number],
  rows: FactRow[],
  radiusM: number,
  /** Kildens faktiske antall i området, når listen er kuttet av radgrensen. */
  antallIOmradet?: number,
  /** Merknad om at kartet bare tegner de nærmeste. */
  kartnote?: string | null,
): FactCluster | null {
  const treff = rows.filter((row) => spec.categories.includes(row.category));
  if (treff.length === 0) return null;

  const antall = new Map(
    spec.lists.map((list) => [
      list.id,
      {
        antall: treff.filter((row) => list.subtypes.includes(row.subtype)).length,
        ental: list.ental,
        flertall: list.flertall,
      },
    ]),
  );
  const summary = describeClusterSummary([...antall.values()], formatRadius(radiusM));

  // Grupper med kort: de nærmeste som hele kort, resten bak «Se alle …».
  if (spec.cards) {
    const forside = treff.slice(0, CLUSTER_PREVIEW);
    const tekst = describeAnleggSummary({ total: treff.length, radiusLabel: formatRadius(radiusM) });
    return {
      sectionId: "naeromradet",
      id: spec.id,
      label: spec.label,
      summary,
      facts: forside.flatMap((row) => factFromRow(row) ?? []),
      lists: [],
      overview:
        treff.length > forside.length
          ? {
              sectionId: "naeromradet",
              toggleLabel: `Se alle ${spec.lists[0]!.flertall}`,
              total: treff.length,
              noAttentionNote: null,
              headline: tekst.headline,
              details: tekst.details,
              caveat: tekst.caveat,
              sourceName: sourceNames(treff),
              items: treff.map((row) => overviewItem(row, placeSubtitle(row.subtype))),
            }
          : null,
      caveat: spec.caveat || null,
      sourceName: sourceNames(treff),
    };
  }

  const lists: ClusterList[] = [];

  // Radgrensen kan ha kuttet listen. Da er det databasens telling som er sann.
  const kuttet = antallIOmradet !== undefined && antallIOmradet > treff.length;

  for (const list of spec.lists) {
    // rows er allerede sortert nærmest først, så filtreringen beholder avstandsrekkefølgen.
    const alle = treff.filter((row) => list.subtypes.includes(row.subtype));
    // Én liste i gruppen: da gjelder gruppens totale antall for den listen.
    const total = kuttet && spec.lists.length === 1 ? antallIOmradet : alle.length;
    if (alle.length === 0) continue;

    const items = alle
      .slice(0, CLUSTER_LIST_CAP)
      .map((row) => overviewItem(row, describePlaceLine({ subtype: row.subtype, attributes: row.attributes })));

    lists.push({
      id: list.id,
      label: list.label,
      toggleLabel:
        alle.length > CLUSTER_PREVIEW
          ? describeClusterToggle({ flertall: list.flertall, vist: items.length, total })
          : null,
      items,
      previewCount: CLUSTER_PREVIEW,
      total,
    });
  }

  return {
    sectionId: "naeromradet",
    id: spec.id,
    label: spec.label,
    summary: describeClusterSummary(
      [...antall].map(([id, del]) => ({ ...del, antall: lists.find((l) => l.id === id)?.total ?? del.antall })),
      formatRadius(radiusM),
    ),
    facts: [],
    lists,
    overview: null,
    caveat: [spec.caveat, kartnote].filter(Boolean).join(" "),
    sourceName: sourceNames(treff),
  };
}


/** Eksportert for test: grupperingen er produktlogikk og verifiseres uten database. */
export function placeFacts(rows: FactRow[], radiusM: number, antallPerKategori: Partial<Record<AreaCategory, number>> = {}) {
  const sorted = [...rows].sort(byRelevance);
  const servering = sorted.filter((row) => row.category === "servering");
  const kartnote =
    servering.length > SERVERING_MARKER_CAP ? `Kartet viser de ${SERVERING_MARKER_CAP} nærmeste stedene.` : null;

  return {
    // Ingen løse kort i seksjonen: alt ligger i en gruppe, som resten av siden.
    facts: [] as AreaFact[],
    clusters: CLUSTER_SPECS.flatMap(
      (spec) =>
        buildCluster(
          spec,
          sorted,
          radiusM,
          antallPerKategori[spec.categories[0]!],
          spec.categories.includes("servering") ? kartnote : null,
        ) ?? [],
    ),
    // Skjenkesteder er så tette i sentrum at alle markørene ville skjult resten av kartet.
    mapFeatures: [...sorted.filter((row) => row.category !== "servering"), ...servering.slice(0, SERVERING_MARKER_CAP)]
      .sort(byRelevance)
      .flatMap(mapFeatureFromRow),
  };
}

async function runLookups(lat: number, lng: number, radiusM: number): Promise<{ results: LookupResult[]; failed: string[] }> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${radiusM}`;
  const cached = lookupCache.get(key);
  if (cached) return { results: cached, failed: [] };

  const signal = AbortSignal.timeout(LOOKUP_BUDGET_MS);
  const settled = await Promise.allSettled(
    areaLookups.map(async (lookup) => ({
      lookupId: lookup.id,
      category: lookup.category,
      hits: await lookup.run({ lat, lng, radiusM, signal }),
    })),
  );

  const results: LookupResult[] = [];
  const failed: string[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") results.push(outcome.value);
    else {
      const lookup = areaLookups[index]!;
      failed.push(lookup.id);
      console.warn(`[facts] ${lookup.id} svarte ikke: ${outcome.reason instanceof Error ? outcome.reason.name : "ukjent"}`);
    }
  });

  // Bare komplette resultater caches.
  if (failed.length === 0) lookupCache.set(key, results);
  return { results, failed };
}

/**
 * Grupperer fakta i visningsrekkefølgen fra AREA_CATEGORIES. Tomme kategorier faller bort,
 * så de som har innhold flytter opp av seg selv. Forurenset grunn beholdes selv uten kort,
 * fordi den utvidbare oversikten fortsatt skal være tilgjengelig.
 */
export function groupFacts(
  facts: AreaFact[],
  overviews: SectionOverview[] = [],
  sections: readonly AreaSection[] = AREA_SECTIONS,
  clusters: FactCluster[] = [],
): AreaFactGroup[] {
  return sections.map((section) => ({
    sectionId: section.id,
    label: section.label,
    intro: section.intro,
    facts: facts
      .filter((f) => section.categories.includes(f.category))
      .sort((a, b) => Number(b.contains) - Number(a.contains) || (a.distanceM ?? 0) - (b.distanceM ?? 0)),
    clusters: clusters.filter((cluster) => cluster.sectionId === section.id),
    overview: overviews.find((o) => o.sectionId === section.id) ?? null,
  })).filter((group) => group.facts.length > 0 || group.clusters.length > 0 || group.overview !== null);
}

/**
 * Hvilke kilder svaret skal bygges av.
 *
 * Målt i produksjon: databasen svarer på 100–800 ms, mens de direkte oppslagene bruker opptil
 * fem sekunder — strategisk støykartlegging alene tok 4,3 s på Alnabru. Ved å hente dem hver
 * for seg kan Nærområdet og Forurenset grunn vises med én gang, mens Støy fylles inn etterpå.
 */
export type FactSources = "all" | "db" | "lookups";

export async function getAreaFacts(params: {
  lat: number;
  lng: number;
  radius: number;
  sources?: FactSources;
}): Promise<AreaFactsResult> {
  const { lat, lng, radius, sources: sourceSet = "all" } = params;
  const brukDb = sourceSet !== "lookups";
  const brukOppslag = sourceSet !== "db";
  let rows: FactRow[] = [];
  let antallPerKategori: Partial<Record<AreaCategory, number>> = {};
  let contaminatedTruncated = false;
  let dbFailed: string | null = null;

  try {
    if (!brukDb) throw new SkipSource();
    const db = await getReadDb();
    if (!db) throw new Error("ingen database");
    // To spørringer: forurenset grunn er så tett i byer at den ellers fyller hele radgrensen
    // og skyver ut kvikkleire, støy, kraftanlegg og anlegg med utslippstillatelse.
    const [contaminatedRaw, serveringRaw, otherRaw, countsRaw] = await Promise.all([
      db.rpc<unknown>("features_near", { lat, lng, radius_m: radius, categories: ["miljo"], max_results: FEATURE_LIMIT }),
      db.rpc<unknown>("features_near", {
        lat,
        lng,
        radius_m: radius,
        categories: ["servering"],
        max_results: SERVERING_LIMIT,
      }),
      db.rpc<unknown>("features_near", {
        lat,
        lng,
        radius_m: radius,
        categories: OTHER_CATEGORIES,
        max_results: FEATURE_LIMIT,
      }),
      // Antallet i teksten skal være kildens, ikke radgrensens.
      db.rpc<unknown>("features_count_near", { lat, lng, radius_m: radius, categories: ["servering"] }),
    ]);
    const contaminated = z.array(rowSchema).parse(contaminatedRaw);
    rows = [...contaminated, ...z.array(rowSchema).parse(serveringRaw), ...z.array(rowSchema).parse(otherRaw)];
    contaminatedTruncated = contaminated.length >= FEATURE_LIMIT;
    antallPerKategori = Object.fromEntries(
      z
        .array(z.object({ category: z.enum(AREA_CATEGORIES), antall: z.coerce.number() }))
        .parse(countsRaw)
        .map((rad) => [rad.category, rad.antall]),
    );
  } catch (error) {
    if (error instanceof SkipSource) {
      // Kilden er bevisst utelatt fra dette svaret, ikke nede.
    } else {
      dbFailed =
        getDbMode() === "none"
          ? "Ingen database konfigurert."
          : error instanceof Error
            ? `${error.name}: ${error.message}`.slice(0, 300)
            : "Ukjent feil";
      console.error("[facts] databasefeil:", dbFailed);
    }
  }

  const { results: lookupResults, failed } = brukOppslag
    ? await runLookups(lat, lng, radius)
    : { results: [], failed: [] };

  if (dbFailed && lookupResults.length === 0) return { status: "unavailable", devReason: dbFailed };
  // Alle de direkte oppslagene nede er en feil, ikke et tomt område.
  if (!brukDb && lookupResults.length === 0 && failed.length > 0) {
    return { status: "unavailable", devReason: `Alle direkte oppslag feilet: ${failed.join(", ")}` };
  }

  const facts: AreaFact[] = [];
  const usedSources = new Set<string>();

  // Samme objekt kan ligge som flere rader (oppdelte soner, kraftledninger i segmenter).
  // Vis ett faktum per (kilde, type, navn) — det nærmeste.
  const nearestRows = new Map<string, FactRow>();
  for (const row of rows) {
    if (row.subtype === "forurenset_grunn" || PLACE_CATEGORIES.has(row.category)) continue;
    const key = `${row.provider_id}|${row.subtype}|${row.title}`;
    const current = nearestRows.get(key);
    if (!current || Number(row.contains) > Number(current.contains) || row.distance_m < current.distance_m) {
      nearestRows.set(key, row);
    }
  }

  const overviews: SectionOverview[] = [];
  const clusters: FactCluster[] = [];
  const mapFeatures: AreaMapFeature[] = [];

  const contaminatedRows = rows.filter((r) => r.subtype === "forurenset_grunn");
  let contaminationAtSearchPoint = false;
  if (contaminatedRows.length > 0) {
    const result = contaminatedFacts(contaminatedRows, radius, contaminatedTruncated);
    clusters.push(result.cluster);
    mapFeatures.push(...result.mapFeatures);
    contaminationAtSearchPoint = result.affectsSearchPoint;
    usedSources.add("mdir-forurenset-grunn");
  }

  // Alt som hører hjemme i «Nærområdet», uavhengig av kilde.
  const placeRows = rows.filter((r) => PLACE_CATEGORIES.has(r.category));
  if (placeRows.length > 0) {
    const result = placeFacts(placeRows, radius, antallPerKategori);
    facts.push(...result.facts);
    clusters.push(...result.clusters);
    mapFeatures.push(...result.mapFeatures);
    for (const row of placeRows) usedSources.add(row.provider_id);
  }

  for (const row of nearestRows.values()) {
    const fact = toFact({
      id: row.id,
      providerId: row.provider_id,
      externalId: row.external_id,
      category: row.category,
      subtype: row.subtype,
      title: row.title,
      attributes: row.attributes,
      distanceM: row.distance_m,
      contains: row.contains,
      sourceUrl: row.source_url,
      sourceUrlType: row.source_url_type,
      sourceUpdatedAt: row.source_updated_at,
    });
    if (!fact) continue;
    facts.push(fact);
    usedSources.add(row.provider_id);
  }

  for (const result of lookupResults) {
    for (const hit of result.hits) {
      const fact = toFact({
        id: `${result.lookupId}:${hit.subtype}`,
        providerId: result.lookupId,
        category: result.category,
        subtype: hit.subtype,
        title: hit.title,
        attributes: hit.attributes,
        distanceM: hit.distanceM,
        contains: hit.contains,
        sourceUrl: hit.sourceUrl ?? null,
        sourceUrlType: null,
        sourceUpdatedAt: hit.sourceUpdatedAt ?? null,
      });
      if (!fact) continue;
      facts.push(fact);
      usedSources.add(result.lookupId);
    }
  }

  // Grunnforhold og infrastruktur får kilder fra både databasen og direkte oppslag. Gruppene
  // deres bygges derfor først når delsvarene er slått sammen (lib/facts/clusters.ts), ellers
  // hadde seksjonen fått én gruppe per kilde.
  const sections = sectionOrder({ contaminationAtSearchPoint });
  const groups = groupFacts(facts, overviews, sections, clusters);

  const unavailable = [...failed, ...(dbFailed ? ["database"] : [])]
    .map((id) => SOURCES[id]?.name ?? (id === "database" ? "lagrede kilder" : id))
    .filter((name, index, all) => all.indexOf(name) === index);

  return {
    status: "ok",
    groups,
    order: sections.map((section) => section.id),
    mapFeatures,
    sources: [...usedSources].flatMap((id) => (SOURCES[id] ? [SOURCES[id]] : [])),
    unavailableSources: unavailable,
  };
}
