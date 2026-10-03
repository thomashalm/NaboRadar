import { HUT_REFRESH_FN, HUT_SOURCE_CATEGORY, inHutBounds, type HutSourceAttributes } from "@/lib/huts/types";
import { gmlPoint, nested, wfsPages, type GmlFeature } from "@/lib/providers/gml";
import type {
  AreaFeatureProvider,
  NormalizeResult,
  ProviderHealth,
  RawBatch,
  RejectedRecord,
  SyncOptions,
} from "@/lib/providers/types";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import type { AreaAttributes, NormalizedAreaFeature } from "@/types/area-feature";
import type { Db } from "@/lib/db/types";
import { formatHutElevationResult, refreshHutElevations } from "@/lib/huts/elevation-sync";

/**
 * Hytter fra Kartverkets Tur- og friluftsruter («Turrutebasen») — sekundærkilden.
 *
 * Datasettet er først og fremst ruter, men `RuteInfoPunkt` har også hyttene langs dem: 1 356 i
 * hele landet. Det den gir som N50 ikke har, er en varig `lokalId` (UUID) og, for noen hytter,
 * navnet på den som har vedlikeholdsansvaret («DNT Oslo og Omegn», «Lunner Almenning»).
 *
 * Den er sekundær fordi kvaliteten er ujevn:
 *
 *   - `tilrettelegging` er en tallkode uten publisert nøkkel. Betydningen av 42, 43 og 44 er
 *     fastslått ved å sammenligne med N50 på samme koordinat: 94 av 103, 166 av 173 og 470 av
 *     520 stemmer med henholdsvis betjent, selvbetjent og ubetjent. Kode 12 er «hytte» uten
 *     nærmere type (rastebuer, dagsturmål og serveringssteder om hverandre) og gir derfor
 *     ingen type — en slik post kan støtte en hytte N50 allerede har, men oppretter ingen.
 *   - `opphav` er som regel hyttenavnet, men noen ganger digitaliseringsmetoden («Rett i
 *     kartet»), og da står navnet i `informasjon`.
 *   - `vedlikeholdsansvarlig` er fritekst. Kategoriordene («DNT», «Andre», «Statskog») blir
 *     eierkategori; alt annet er et navn.
 *   - `sesong` er en bokstavkode (H/S/V) uten publisert nøkkel på 144 av hyttene. Den lagres
 *     som kildefelt og vises ikke.
 *
 * Koordinatene er de samme som i N50 for hyttene som finnes begge steder, så koblingen i
 * `refresh_huts()` er i praksis eksakt.
 */
const WFS = "https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter";
const TYPENAME = "RuteInfoPunkt";
const DATASETT = "https://kartkatalog.geonorge.no/metadata/turrutebasen/d1422d17-6d95-4ef1-96ab-8af31744dd63";

const TYPE: Record<string, Pick<HutSourceAttributes, "hut_type" | "overnight">> = {
  "42": { hut_type: "staffed_hut", overnight: "yes" },
  "43": { hut_type: "self_service_hut", overnight: "yes" },
  "44": { hut_type: "unstaffed_hut", overnight: "yes" },
  "12": { hut_type: null, overnight: null },
};

const KATEGORIORD: Record<string, HutSourceAttributes["owner_kind"]> = {
  dnt: "dnt",
  statskog: "statskog",
  fjellstyre: "fjellstyre",
  andre: "other",
  ukjent: null,
  privat: null,
};

/**
 * Verdier i `opphav` som sier hvor punktet kommer fra, ikke hva hytta heter. Feltet er fritekst
 * og brukes til begge deler. Nasjonalt går «Naturkartan», «Statskog», «Nordlandsruta.no» og
 * navn på friluftsråd igjen på mange hytter — tatt som navn ville de gitt hytter som heter
 * «Statskog». Da brukes navnet i `informasjon` i stedet, når det finnes.
 */
const DIGITALISERINGSMETODE = /^(rett i kartet|ukjent|gps|ortofoto|naturkartan|statskog|nordlandsruta\.no|.*\bfriluftsråd)$/i;

/** Hyttenavnet, eller null når posten ikke har noe som kan være et navn. */
export function turruteHutName(opphav: string | null, informasjon: string | null): string | null {
  if (opphav && !DIGITALISERINGSMETODE.test(opphav)) return opphav;
  // «Svartvannshytta - ubetjent DNT hytte» → «Svartvannshytta».
  const fraInfo = informasjon?.split(/\s+-\s+/)[0]?.trim();
  return fraInfo && fraInfo.length >= 3 && !/^(rastebu|dagstur)$/i.test(fraInfo) ? fraInfo : null;
}

/** Fritekstfeltet delt i eierkategori og forvalternavn. */
export function turruteManager(value: string | null): Pick<HutSourceAttributes, "owner_kind" | "manager_name"> {
  if (!value) return { owner_kind: null, manager_name: null };
  const deler = value.split("|").map((del) => del.trim()).filter(Boolean);
  const navn = deler.filter((del) => !(del.toLowerCase() in KATEGORIORD));
  const kategori = deler.map((del) => KATEGORIORD[del.toLowerCase()]).find((k) => k !== undefined && k !== null) ?? null;
  const manager_name = navn.length > 0 ? navn.join(", ") : null;
  const dntNavn = manager_name !== null && /\bDNT\b|turistforening|turlag/i.test(manager_name);
  return { owner_kind: kategori ?? (dntNavn ? "dnt" : null), manager_name };
}

export class KartverketTurrutebasenHytterProvider implements AreaFeatureProvider {
  readonly id = "kartverket-turrutebasen-hytter";
  readonly name = "Hytter i Tur- og friluftsruter";
  readonly owner = "Kartverket";
  readonly recordKind = "area_feature" as const;
  readonly license = { name: "Åpne data fra Kartverket (ingen bruksvilkår oppgitt i metadata)", url: DATASETT };
  readonly defaultStatus = "active" as const;
  readonly statusReason = "Hele landet.";
  readonly postSyncFn = HUT_REFRESH_FN;

  /** Terrenghøyden for nye og flyttede hytter (se lib/huts/elevation-sync.ts). */
  async afterSync(db: Db): Promise<string> {
    return formatHutElevationResult(await refreshHutElevations(db, { pauseMs: 200 }));
  }

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retry: HttpRetryPolicy = { ...DEFAULT_RETRY_POLICY, timeoutMs: 60_000 },
  ) {}

  async *fetch(options: SyncOptions): AsyncIterable<RawBatch> {
    for await (const features of wfsPages({
      baseUrl: WFS,
      typeName: TYPENAME,
      signal: options.signal,
      retry: this.retry,
      fetchImpl: this.fetchImpl,
    })) {
      // Datasettet har alt fra benker til badeplasser. Bare hyttekodene sendes videre, så
      // tellerne i kjøringen handler om hytter.
      yield { features: features.filter((f) => String(f.tilrettelegging ?? "") in TYPE), documents: [] };
    }
  }

  normalize(batch: RawBatch): NormalizeResult<NormalizedAreaFeature> {
    const records: NormalizedAreaFeature[] = [];
    const rejected: RejectedRecord[] = [];
    const skipped: RejectedRecord[] = [];

    for (const feature of batch.features as GmlFeature[]) {
      const lokalId = nested(feature, "identifikasjon", "Identifikasjon", "lokalId");
      const punkt = gmlPoint(feature, "posisjon");
      const kode = String(feature.tilrettelegging ?? "");

      if (!lokalId || !punkt) {
        rejected.push({ kind: "feature", externalId: lokalId, reason: !lokalId ? "mangler lokalId" : "mangler posisjon" });
        continue;
      }
      if (!inHutBounds(punkt)) {
        skipped.push({ kind: "feature", externalId: lokalId, reason: "koordinat utenfor Norge" });
        continue;
      }
      const navn = turruteHutName(nested(feature, "opphav"), nested(feature, "informasjon"));
      if (!navn) {
        skipped.push({ kind: "feature", externalId: lokalId, reason: "hytte uten navn" });
        continue;
      }

      const attributes: HutSourceAttributes = {
        ...TYPE[kode]!,
        ...turruteManager(nested(feature, "vedlikeholdsansvarlig")),
        locked: null,
        beds: null,
        municipality_number: null,
        kilde_tilrettelegging: kode,
        kilde_sesong: nested(feature, "sesong"),
      };

      records.push({
        providerId: this.id,
        externalId: lokalId,
        category: HUT_SOURCE_CATEGORY,
        subtype: attributes.hut_type ?? "hytte",
        title: navn,
        geometry: { type: "Point", coordinates: [round6(punkt[0]), round6(punkt[1])] },
        attributes: { ...attributes } satisfies AreaAttributes,
        sourceUrl: DATASETT,
        sourceUrlType: "provider_page",
        sourceUpdatedAt: toIso(nested(feature, "oppdateringsdato")),
      });
    }

    return { records, rejected, skipped };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = performance.now();
    try {
      let antall = 0;
      for await (const side of wfsPages({ baseUrl: WFS, typeName: TYPENAME, pageSize: 5, retry: this.retry, fetchImpl: this.fetchImpl })) {
        antall += side.length;
        break;
      }
      return { ok: antall > 0, checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), message: antall > 0 ? "WFS svarer" : "WFS svarte uten data" };
    } catch (error) {
      return { ok: false, checkedAt: new Date().toISOString(), latencyMs: null, message: error instanceof Error ? error.name : "Ukjent feil" };
    }
  }
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

function toIso(value: string | null): string | null {
  if (!value) return null;
  // Kilden oppgir tidspunkt uten sone; de er UTC.
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
