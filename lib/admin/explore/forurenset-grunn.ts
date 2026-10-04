import "server-only";
import {
  AREALBRUK_TEXT,
  LOKALITET_TYPE_SETNING,
  PAAVIRKNINGSGRAD_SHORT,
  PAAVIRKNINGSGRAD_TEKNISK,
  PROSESS_STATUS_SETNING,
  TILSTANDSKLASSE_TEXT,
} from "@/lib/facts/wording";
import { dato, hentAreaFeatures, rader, tall, tekst, type AreaFeatureRad } from "./area-features";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Forurenset grunn i Utforsk data: Miljødirektoratets registrerte lokaliteter.
 *
 * INTERNT. Datasettet vises ikke offentlig (produktbeslutning 2026-10-03): kategorien er
 * avpublisert, og `/omrade` verken henter eller viser det. Denne adapteren endrer ikke det —
 * den leser gjennom en funksjon som bare gir rader til admin.
 *
 * Myndighetens vurdering gjengis med kildens egne ord (påvirkningsgrad 1, 2, 3 og X). Vi gjør
 * den ikke sterkere enn den er: «akseptabel med dagens arealbruk» er ikke «forurenset», og
 * «uavklart» er ikke «farlig».
 */
const PROVIDER = "mdir-forurenset-grunn";

export const forurensetGrunnDataset: ExploreDataset = {
  id: "forurenset-grunn",
  label: "Forurenset grunn",
  unit: { one: "lokalitet", many: "lokaliteter" },
  aliases: ["forurenset grunn", "forurensning", "grunnforurensning", "forurenset", "forurensede lokaliteter"],
  needsArea: true,
  policy: { openMap: "nei", omrade: "nei" },
  description: "Miljødirektoratets registrerte lokaliteter. Internt datasett — vises ikke offentlig. En registrering gjelder lokaliteten, ikke hele eiendommen.",

  async load(client, area) {
    if (!area) return { features: [], total: 0, error: null };
    const svar = await hentAreaFeatures(client, PROVIDER, area);
    if (svar.error) return { features: [], total: 0, error: svar.error };
    return { features: svar.rader.map((rad) => forurensetGrunnFeature(rad, area.kind === "kommune" ? area.name : null)), total: svar.total, error: null };
  },
};

const utenPunktum = (setning: string | undefined) => (setning ? setning.replace(/\.$/, "") : null);

/** Eksportert for test. */
export function forurensetGrunnFeature(rad: AreaFeatureRad, kommune: string | null): Omit<ExploreFeature, "datasetId" | "datasetLabel"> {
  const a = rad.attributes;
  const grad = tekst(a.paavirkningsgrad) ?? "";
  const type = LOKALITET_TYPE_SETNING[tekst(a.lokalitetType) ?? ""];
  const areal = tall(a.arealM2);
  const aar = tall(a.registrertAar);
  const tilstand = TILSTANDSKLASSE_TEXT[tekst(a.tilstandsklasse) ?? ""];
  const arealbruk = AREALBRUK_TEXT[tekst(a.arealbruk) ?? ""];

  return {
    id: rad.id,
    title: rad.title,
    kind: "Registrert lokalitet",
    style: "forurenset_grunn",
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: kommune,
    // Kildens korte etikett for vurderingen. Ukjent kode vises ikke rått.
    summary: PAAVIRKNINGSGRAD_SHORT[grad] ? `Myndighetens vurdering: ${PAAVIRKNINGSGRAD_SHORT[grad]}` : null,
    details: rader([
      PAAVIRKNINGSGRAD_TEKNISK[grad] ? { label: "Vurdering", value: PAAVIRKNINGSGRAD_TEKNISK[grad]! } : null,
      utenPunktum(PROSESS_STATUS_SETNING[tekst(a.prosessStatus) ?? ""]) ? { label: "Oppfølging", value: utenPunktum(PROSESS_STATUS_SETNING[tekst(a.prosessStatus) ?? ""])! } : null,
      tekst(a.status) ? { label: "Registerstatus", value: tekst(a.status)! } : null,
      type ? { label: "Lokalitetstype", value: type } : null,
      tilstand ? { label: "Tilstandsklasse", value: tilstand } : null,
      arealbruk ? { label: "Arealbruk", value: arealbruk } : null,
      areal !== null && areal > 0 ? { label: "Areal", value: `${Math.round(areal).toLocaleString("nb-NO")} m²` } : null,
      aar ? { label: "Registrert", value: String(aar) } : null,
      typeof a.harStoffopplysninger === "boolean" ? { label: "Stoffopplysninger", value: a.harStoffopplysninger ? "finnes i faktaarket" : "ikke oppgitt" } : null,
      kommune ? { label: "Kommune", value: kommune } : null,
      dato(rad.source_updated_at) ? { label: "Sist oppdatert i kilden", value: dato(rad.source_updated_at)! } : null,
      { label: "Lokalitet-ID", value: rad.external_id },
    ]),
    explanation: "Registreringen gjelder lokaliteten slik den er avgrenset i registeret, ikke hele eiendommen. Vurderingen er forurensningsmyndighetens.",
    notice: "Internt datasett. Vises ikke på /omrade eller i noe offentlig kart.",
    sourceName: "Grunnforurensning (Miljødirektoratet)",
    sourceUrl: rad.source_url,
    href: null,
    hrefLabel: null,
  };
}
