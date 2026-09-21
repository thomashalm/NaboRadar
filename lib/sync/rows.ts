import type { NormalizedEvent } from "@/types/event";

/** Format som public.upsert_events(p_events jsonb) forventer. */
export interface EventRow {
  external_id: string;
  type: string;
  title: string;
  geometry: NormalizedEvent["geometry"];
  municipality_number: string | null;
  municipality_name: string | null;
  announced_at: string | null;
  source_updated_at: string | null;
  source_url: string | null;
  source_url_type: string | null;
  attributes: NormalizedEvent["attributes"];
  raw_data: NormalizedEvent["rawData"];
  content_hash: string;
  documents: {
    external_id: string;
    type: string;
    title: string;
    url: string;
    mime_type: string | null;
    document_date: string | null;
  }[];
}

export function toEventRow(event: NormalizedEvent, hash: string): EventRow {
  return {
    external_id: event.externalId,
    type: event.type,
    title: event.title,
    geometry: event.geometry,
    municipality_number: event.municipalityNumber,
    municipality_name: event.municipalityName,
    announced_at: event.announcedAt,
    source_updated_at: event.sourceUpdatedAt,
    source_url: event.sourceUrl,
    source_url_type: event.sourceUrlType,
    attributes: event.attributes,
    raw_data: event.rawData,
    content_hash: hash,
    documents: event.documents.map((d) => ({
      external_id: d.externalId,
      type: d.type,
      title: d.title,
      url: d.url,
      mime_type: d.mimeType,
      document_date: d.documentDate,
    })),
  };
}
