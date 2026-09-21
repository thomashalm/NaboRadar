import type { MultiPolygon, Point, Polygon } from "geojson";
import type { NormalizedDocument } from "./document";

/**
 * Alle hendelsestyper arkitekturen kjenner til.
 * Kun typer i ACTIVE_EVENT_TYPES har en fungerende provider.
 */
export const EVENT_TYPES = [
  "planning_started",
  "building_case",
  "regulation",
  "regulation_hearing",
  "road_work",
  "public_hearing",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const ACTIVE_EVENT_TYPES = ["planning_started"] as const satisfies readonly EventType[];

/** Geometri i WGS84 lon/lat (GeoJSON / CRS84). */
export type EventGeometry = Polygon | MultiPolygon | Point;

/**
 * Hva slags lenke sourceUrl er.
 * - municipal: lenke kommunen/forslagsstiller selv har lagt inn i kildedata
 * - provider_page: stabil side hos dataeieren (f.eks. DiBK sin HTML-visning)
 * - document: direkte lenke til et kildedokument
 */
export type SourceUrlType = "municipal" | "provider_page" | "document";

/**
 * Provider-spesifikke visningsfelt som ikke fortjener egne kolonner.
 * Kun verdier kilden faktisk leverer. Aldri avledede antakelser.
 */
export type EventAttributes = Record<string, string | null>;

/**
 * Resultatet av en providers normalisering. Dette er det eneste providers leverer
 * videre til sync-laget.
 */
export interface NormalizedEvent {
  providerId: string;
  /** Stabil ID i kilden. For DiBK: arealplan-ID. Unik sammen med providerId. */
  externalId: string;
  type: EventType;
  title: string;
  geometry: EventGeometry;
  municipalityNumber: string | null;
  /** Kilden leverer ikke alltid navn (DiBK gjør det ikke). */
  municipalityName: string | null;
  /** Når saken ble kunngjort/varslet (YYYY-MM-DD). DiBK: kunngjøringsdatoVarselOmPlanoppstart. */
  announcedAt: string | null;
  /** Når dataposten sist ble endret i kilden (ISO 8601). DiBK: oppdateringsdato. */
  sourceUpdatedAt: string | null;
  /** Kun fullstendige, gyldige http(s)-URL-er. Aldri gjettet. */
  sourceUrl: string | null;
  sourceUrlType: SourceUrlType | null;
  attributes: EventAttributes;
  documents: NormalizedDocument[];
  /** Utvalgt originaldata for feilsøking. Aldri personopplysninger eller berørte parter. */
  rawData: Record<string, unknown>;
}

/** Event slik det ligger i databasen. Avledede felt beregnes av PostGIS. */
export interface StoredEvent extends Omit<NormalizedEvent, "documents"> {
  id: string;
  /** ST_PointOnSurface — for kartmarkør/label, ikke for radiusfiltrering. */
  centroid: Point;
  /** ST_Area(geography). Beregnet av oss, ikke et offisielt tall. null for punkter. */
  computedAreaM2: number | null;
  contentHash: string;
  /** Første gang NaboRadar så saken. */
  firstSeenAt: string;
  /** Siste gang NaboRadar hentet saken fra kilden. */
  syncedAt: string;
  /** Satt når saken ikke lenger finnes i kilden ved full reconciliation. Slettes ikke. */
  removedFromSourceAt: string | null;
}

/** Resultat fra geografisk spørring. distanceM er relativ til søkepunktet og lagres aldri. */
export interface EventWithDistance extends StoredEvent {
  /** Korteste avstand fra punkt til geometri i meter. 0 hvis punktet ligger inni. */
  distanceM: number;
}

/**
 * Det resultatsiden trenger for ett event — et utsnitt av EventWithDistance.
 * Aldri rawData til nettleseren.
 */
export type AreaEvent = Pick<
  EventWithDistance,
  | "id"
  | "type"
  | "title"
  | "announcedAt"
  | "sourceUpdatedAt"
  | "distanceM"
  | "computedAreaM2"
  | "centroid"
  | "geometry"
  | "municipalityNumber"
  | "sourceUrl"
  | "sourceUrlType"
  | "attributes"
>;

export type AreaSort = "distance" | "newest";
