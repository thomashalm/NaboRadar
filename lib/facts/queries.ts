import { z } from "zod";
import { createLookupRunner, type LookupResult } from "./lookup-runner";
import { getDbMode, getReadDb, type Db } from "@/lib/db";
import { formatDistance, formatRadius } from "@/lib/format";
import { MAX_RADIUS_M } from "@/lib/geo/constants";
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
import {
  ANLEGG_TYPE_LABEL,
  describeAnleggSummary,
  describeClusterSummary,
  describeClusterToggle,
  describeTilfluktsromIngen,
  describeTilfluktsromLine,
  describeTilfluktsromNaermeste,
  describeTilfluktsromSummary,
  TILFLUKTSROM_CAVEAT,
  TILFLUKTSROM_UTILGJENGELIG,
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
  /** Vis gruppen åpen. Brukes når gruppen er selve svaret på det brukeren søkte etter. */
  defaultOpen?: boolean;
  /**
   * Ingenting innen valgt radius. Da er det ingen gruppe å åpne — bare én linje, og eventuelt
   * lenken til de nærmeste rommene. `nearestLink` er satt bare når lenken faktisk fører til et
   * treff.
   */
  emptyNote?: { text: string; nearestLink: boolean } | null;
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

/** Direkte oppslag: cache og pause per kilde (se lib/facts/lookup-runner.ts). */
const lookupRunner = createLookupRunner(areaLookups);

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
    compact: text.compact ?? null,
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
 * Forurenset grunn er et internt datasett (produktbeslutning 2026-10-03).
 *
 * Den offentlige `/omrade` viser det ikke lenger: en registrering i nærheten har normalt liten
 * verdi for en boligkjøpsbeslutning. Kategorien er upublisert i databasen, så lese-RPC-ene
 * returnerer den bare til innlogget admin, og offentlig spør vi ikke etter den i det hele tatt.
 *
 * Admins adressevisning ser alt (`contaminatedScope: "alle"`): kort for grad 3/X og for
 * lokaliteten søkepunktet ligger i, og alle registreringene i «Se alle» og kartet. Dataene
 * lagres og synkes uendret.
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

/** `ingen`: offentlig, datasettet hentes ikke. `alle`: admin, hele datagrunnlaget. */
export type ContaminatedScope = "ingen" | "alle";

/**
 * «Kildedata sist oppdatert», ikke bare «oppdatert»: datoen er kildens `oppdateringsdato`, da
 * registreringen sist ble endret hos Miljødirektoratet — ikke en fersk vurdering av stedet.
 */
function contaminatedDateLabel(sourceUpdatedAt: string | null): string | null {
  if (!sourceUpdatedAt) return null;
  const year = new Date(sourceUpdatedAt).getUTCFullYear();
  return Number.isFinite(year) ? `Kildedata sist oppdatert ${year}` : null;
}

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

/**
 * Offentlige tilfluktsrom som én kompakt gruppe.
 *
 * Holdes utenfor dedupliseringen på (kilde, type, tittel): to rom kan dele stedsbeskrivelse
 * uten å være samme rom, og da skal begge vises. Hvert rom har sin egen lokalId fra DSB.
 *
 * Eksportert for test — hva som vises og hvordan det formuleres er produktlogikk.
 */
export function shelterFacts(rows: FactRow[], radiusM: number, defaultOpen = false) {
  const sorted = [...rows].sort(byRelevance);
  if (sorted.length === 0) return null;

  // Alle rommene peker til samme datasettside, så en kildelenke per rad ville vært åtte
  // identiske lenker. Kilden står én gang, nederst i gruppen — og i kartpopupen.
  const items = sorted
    .slice(0, CLUSTER_LIST_CAP)
    .map((row) => ({ ...overviewItem(row, describeTilfluktsromLine(row.attributes)), href: null }));

  const cluster: FactCluster = {
    sectionId: "tilfluktsrom",
    id: "tilfluktsrom",
    label: "Tilfluktsrom",
    summary: describeTilfluktsromSummary({ total: sorted.length, radiusLabel: formatRadius(radiusM) }),
    facts: [],
    lists: [
      {
        id: "offentlige-tilfluktsrom",
        label: "Offentlige tilfluktsrom",
        toggleLabel:
          sorted.length > CLUSTER_PREVIEW
            ? describeClusterToggle({ flertall: "tilfluktsrom", vist: items.length, total: sorted.length })
            : null,
        items,
        previewCount: CLUSTER_PREVIEW,
        total: sorted.length,
      },
    ],
    overview: null,
    caveat: TILFLUKTSROM_CAVEAT,
    sourceName: sourceNames(sorted),
    defaultOpen,
  };

  return { cluster, mapFeatures: sorted.flatMap(mapFeatureFromRow) };
}

/** Hvor mange av de nærmeste rommene spesialverktøyet viser når ingen ligger innen radius. */
export const NEAREST_SHELTER_COUNT = 3;

/**
 * Hvor langt ut vi leter etter nærmeste rom: 10 km, samme grense som lesefunksjonen har.
 *
 * Satt etter fordelingen, ikke etter skjønn. Målt 2026-10-03 på 327 adresser spredt over hele
 * Oslo: 17 % har et offentlig tilfluktsrom innen 1 km, 61 % innen 3 km, 93 % innen 5 km og 100 %
 * innen 10 km (lengst: Sørkedalen, 7,3 km). Trinnvis leting — 1, 3, 5, 10 km — ville gitt samme
 * svar med flere spørringer: databasen sorterer på avstand, så ett oppslag ut til 10 km finner
 * de nærmeste direkte.
 */
export const NEAREST_SHELTER_RADIUS_M = MAX_RADIUS_M;

const SHELTER_PROVIDER_ID = "dsb-tilfluktsrom";

/**
 * Tilfluktsrom-seksjonen når ingen rom ligger innen valgt radius.
 *
 * To visninger av samme oppslag:
 *
 * - `/omrade` følger valgt radius. Den sier at ingen ligger innenfor, og lenker til de nærmeste.
 *   Den lister dem ikke — siden skal ikke late som om noe 3 km unna ligger innen 1 km.
 * - Spesialverktøyet `/tilfluktsrom` (`showNearest`) skal alltid svare. Det viser de nærmeste
 *   rommene, tydelig merket som utenfor valgt radius.
 *
 * `nearest` er rommene innen NEAREST_SHELTER_RADIUS_M, nærmest først. Er den tom, finnes det
 * ingen offentlige rom innen 10 km: da står seksjonen bare i spesialverktøyet, med den grensen
 * i teksten. Rommene tegnes ikke i kartet, som er zoomet til valgt radius.
 *
 * Eksportert for test — hva som vises og hvordan det formuleres er produktlogikk.
 */
export function shelterFactsOutsideRadius(
  nearest: FactRow[],
  radiusM: number,
  showNearest: boolean,
): { cluster: FactCluster } | null {
  const sorted = [...nearest].sort(byRelevance).slice(0, NEAREST_SHELTER_COUNT);
  if (sorted.length === 0 && !showNearest) return null;

  const kilde = SOURCES[SHELTER_PROVIDER_ID];
  const base = {
    sectionId: "tilfluktsrom",
    id: "tilfluktsrom",
    label: "Tilfluktsrom",
    facts: [],
    overview: null,
    sourceName: kilde ? `${kilde.name} (${kilde.owner})` : "",
  } satisfies Partial<FactCluster>;

  if (sorted.length === 0) {
    const text = `${describeTilfluktsromIngen(formatRadius(NEAREST_SHELTER_RADIUS_M))}.`;
    return { cluster: { ...base, summary: text, lists: [], caveat: null, emptyNote: { text, nearestLink: false } } };
  }

  const ingen = describeTilfluktsromIngen(formatRadius(radiusM));
  if (!showNearest) {
    return {
      cluster: { ...base, summary: ingen, lists: [], caveat: null, emptyNote: { text: `${ingen}.`, nearestLink: true } },
    };
  }

  return {
    cluster: {
      ...base,
      summary: ingen,
      lists: [
        {
          id: "naermeste-offentlige-tilfluktsrom",
          label: describeTilfluktsromNaermeste(formatRadius(radiusM)),
          toggleLabel: null,
          items: sorted.map((row) => ({ ...overviewItem(row, describeTilfluktsromLine(row.attributes)), href: null })),
          previewCount: NEAREST_SHELTER_COUNT,
          total: sorted.length,
        },
      ],
      caveat: TILFLUKTSROM_CAVEAT,
      defaultOpen: true,
    },
  };
}

/** Oppslaget etter nærmeste rom feilet. Seksjonen sier det, i stedet for å stå tom eller mangle. */
function shelterFactsUnavailable(): { cluster: FactCluster } {
  const text = TILFLUKTSROM_UTILGJENGELIG;
  return {
    cluster: {
      sectionId: "tilfluktsrom",
      id: "tilfluktsrom",
      label: "Tilfluktsrom",
      summary: text,
      facts: [],
      lists: [],
      overview: null,
      caveat: null,
      sourceName: "",
      emptyNote: { text, nearestLink: false },
    },
  };
}

/** Om en registrering fortjener et eget kort, eller bare hører hjemme i oversikten. */
export function needsAttention(input: { contains: boolean; grade: string }): boolean {
  return input.contains || GRADES_NEEDING_ATTENTION.has(input.grade);
}

/** Kortet for én lokalitet, med kildedatoen formulert som «sist oppdatert». */
const contaminatedFact = (row: FactRow): AreaFact[] => {
  const fact = factFromRow(row);
  return fact ? [{ ...fact, sourceDateLabel: contaminatedDateLabel(row.source_updated_at) }] : [];
};

/**
 * Admin: alle registreringene, med kort for grad 3/X og for lokaliteten søkepunktet ligger i.
 *
 * Eksportert for test: hva som løftes fram og hva som telles er produktlogikk. Returnerer
 * `null` når det ikke finnes registreringer.
 */
export function contaminatedFacts(rows: FactRow[], radiusM: number, truncated = false) {
  const sorted = [...rows].sort(byRelevance);
  if (sorted.length === 0) return null;

  const facts = sorted
    .filter((row) => needsAttention({ contains: row.contains, grade: gradeOf(row) }))
    .slice(0, CONTAMINATED_CARD_LIMIT)
    .flatMap(contaminatedFact);

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
  const { results, failed } = await lookupRunner.run(lat, lng, radiusM);
  return { results, failed };
}

/**
 * Grupperer fakta i visningsrekkefølgen fra AREA_CATEGORIES. Tomme kategorier faller bort,
 * så de som har innhold flytter opp av seg selv. En seksjon uten kort beholdes når den har en
 * utvidbar oversikt (forurenset grunn i admins visning).
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
 * for seg kan Nærområdet vises med én gang, mens Støy fylles inn etterpå.
 */
export type FactSources = "all" | "db" | "lookups";

export async function getAreaFacts(params: {
  lat: number;
  lng: number;
  radius: number;
  sources?: FactSources;
  /** Forurenset grunn hentes bare for admin (`alle`). Offentlig (`ingen`) spørres det ikke etter. */
  contaminatedScope?: ContaminatedScope;
  /**
   * Databaseklienten det leses med. Standard er den anonyme leseklienten. Admins adressevisning
   * sender sin innloggede klient, fordi upubliserte kategorier bare returneres til admin.
   */
  db?: Db;
  /**
   * Søket kom fra /tilfluktsrom: vis de nærmeste rommene også når de ligger utenfor valgt
   * radius. Se shelterFactsOutsideRadius.
   */
  nearestShelters?: boolean;
}): Promise<AreaFactsResult> {
  const { lat, lng, radius, sources: sourceSet = "all", contaminatedScope = "ingen" } = params;
  const brukDb = sourceSet !== "lookups";
  const brukOppslag = sourceSet !== "db";
  let rows: FactRow[] = [];
  let antallPerKategori: Partial<Record<AreaCategory, number>> = {};
  let contaminatedTruncated = false;
  let dbFailed: string | null = null;
  /** Nærmeste tilfluktsrom innen 10 km. Hentes bare når ingen ligger innen valgt radius. */
  let nearestShelterRows: FactRow[] = [];
  let nearestSheltersFailed = false;

  try {
    if (!brukDb) throw new SkipSource();
    const db = params.db ?? (await getReadDb());
    if (!db) throw new Error("ingen database");
    // Egne spørringer: forurenset grunn er så tett i byer at den ellers fyller hele radgrensen
    // og skyver ut kvikkleire, støy, kraftanlegg og anlegg med utslippstillatelse.
    const [contaminatedRaw, serveringRaw, otherRaw, countsRaw] = await Promise.all([
      contaminatedScope === "alle"
        ? db.rpc<unknown>("features_near", { lat, lng, radius_m: radius, categories: ["miljo"], max_results: FEATURE_LIMIT })
        : Promise.resolve([]),
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
    // Samme lesefunksjon og samme datasett som resten — bare med større radius og tre treff.
    // Feiler dette ene oppslaget, skal ikke resten av siden falle med det. Men seksjonen sier
    // at den ikke kunne hentes: en teknisk feil skal ikke leses som «ingen rom».
    if (!rows.some((row) => row.category === "tilfluktsrom")) {
      try {
        nearestShelterRows = z.array(rowSchema).parse(
          await db.rpc<unknown>("features_near", {
            lat,
            lng,
            radius_m: NEAREST_SHELTER_RADIUS_M,
            categories: ["tilfluktsrom"],
            max_results: NEAREST_SHELTER_COUNT,
          }),
        );
      } catch (error) {
        nearestSheltersFailed = true;
        console.error("[facts] nærmeste tilfluktsrom feilet:", error instanceof Error ? error.message.slice(0, 200) : "ukjent");
      }
    }
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
    if (row.subtype === "forurenset_grunn" || row.category === "tilfluktsrom" || PLACE_CATEGORIES.has(row.category)) continue;
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
    if (result) {
      clusters.push(result.cluster);
      mapFeatures.push(...result.mapFeatures);
      contaminationAtSearchPoint = result.affectsSearchPoint;
      usedSources.add("mdir-forurenset-grunn");
    }
  }

  // Normalt er de nærmeste utenfor radius. Ligger de innenfor likevel, var hovedspørringen
  // kuttet av radgrensen — da er de vanlige treff, og vises som det.
  const shelterRows = [
    ...rows.filter((r) => r.category === "tilfluktsrom"),
    ...nearestShelterRows.filter((r) => r.distance_m <= radius),
  ];
  if (shelterRows.length === 0 && brukDb && !dbFailed) {
    const result = nearestSheltersFailed
      ? shelterFactsUnavailable()
      : shelterFactsOutsideRadius(nearestShelterRows, radius, params.nearestShelters ?? false);
    if (result) {
      clusters.push(result.cluster);
      if (!nearestSheltersFailed) usedSources.add(SHELTER_PROVIDER_ID);
    }
  }
  if (shelterRows.length > 0) {
    const result = shelterFacts(shelterRows, radius, params.nearestShelters ?? false);
    if (result) {
      clusters.push(result.cluster);
      mapFeatures.push(...result.mapFeatures);
      for (const row of shelterRows) usedSources.add(row.provider_id);
    }
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
  const sections = sectionOrder({ contaminationAtSearchPoint, includeInternal: contaminatedScope === "alle" });
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
