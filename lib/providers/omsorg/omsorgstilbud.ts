import datasett from "@/data/omsorgstilbud.json";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import type { NormalizedAreaFeature } from "@/types/area-feature";
import type { KuratertOmsorgstilbud, OmsorgDatasett } from "./types";

/**
 * Omsorgstilbud: sykehjem, helsehus, behandlingssteder og institusjonsbaserte botilbud.
 *
 * Listen er kurert, fordi kravet ikke er «finnes i et register», men «den ansvarlige aktøren
 * publiserer selv stedet og adressen». scripts/build-omsorg.ts bygger fila fra Oslo kommunes
 * egen stedsindeks og Helsenorges oversikt over behandlingssteder, og forkaster alt der
 * adressen ikke er publisert, ikke har husnummer, eller peker på et administrasjonsbygg.
 *
 * Presis type lagres i `internalType` for kvalitetssikring og filtrering. Brukeren ser bare
 * «Omsorgstilbud» — vi kartlegger stedet, aldri menneskene som bruker det.
 */
const DATA = datasett as OmsorgDatasett;

export class OmsorgstilbudProvider implements AreaFeatureProvider {
  readonly id = "omsorgstilbud";
  readonly name = "Omsorgstilbud";
  readonly owner = "Oslo kommune og Helsenorge";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Norsk lisens for offentlige data (NLOD)", url: "https://data.norge.no/nlod/no/2.0" };
  readonly defaultStatus = "active" as const;
  readonly statusReason = null;

  constructor(private readonly data: OmsorgDatasett = DATA) {}

  // Ingen nettverkskall: datasettet ligger i repoet, og er verifisert før det ble committet.
  async *fetch(_options: SyncOptions): AsyncIterable<RawBatch> {
    yield { features: this.data.steder, documents: [] };
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];

    for (const sted of batch.features as KuratertOmsorgstilbud[]) {
      if (!sted?.id || !sted.navn || typeof sted.lat !== "number" || typeof sted.lng !== "number") {
        rejected.push({ kind: "feature", externalId: sted?.id ?? null, reason: "mangler navn, id eller koordinat" });
        continue;
      }
      // Et sted kan tas ut fordi det er lagt ned, eller fordi adressen ikke lenger skal være
      // offentlig. Da blir raden stående i fila med ny status, men synkes ikke.
      if (sted.status !== "i drift") {
        skipped.push({ kind: "feature", externalId: sted.id, reason: `status ${sted.status}` });
        continue;
      }

      records.push({
        providerId: this.id,
        externalId: sted.id,
        category: "omsorg",
        subtype: "omsorgstilbud",
        title: sted.navn,
        geometry: { type: "Point", coordinates: [sted.lng, sted.lat] },
        attributes: {
          // Intern type lagres for kvalitetssikring og filtrering, men vises aldri som etikett.
          internalType: sted.internalType,
          adresse: sted.adresse,
          postnr: sted.postnr,
          poststed: sted.poststed,
          kommune: sted.kommune,
          operator: sted.operator,
          kilde: sted.kilde,
          // Kort aktørnavn til kartpopup. Listenavnet røper undertypen, aktøren gjør det ikke.
          kildeAktor: sted.kilde.split(" – ")[0] ?? sted.kilde,
          koordinatKilde: sted.koordinatKilde,
          verifisert: sted.verifisert,
        },
        sourceUrl: sted.kildeUrl,
        sourceUrlType: "provider_page",
        sourceUpdatedAt: `${sted.verifisert}T00:00:00Z`,
      });
    }

    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const antall = this.data.steder.filter((s) => s.status === "i drift").length;
    return {
      ok: antall > 0,
      checkedAt: new Date().toISOString(),
      latencyMs: 0,
      message: `${antall} omsorgstilbud, verifisert ${this.data.verifisert}`,
    };
  }
}
