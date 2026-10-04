import type { Db } from "@/lib/db/types";
import { fetchJson } from "@/lib/http";
import { DEFAULT_RETRY_POLICY, type HttpRetryPolicy } from "@/lib/sync/types";
import { classifySchool } from "./classification";

/**
 * Holder `school_units` oppdatert: primær næringskode fra Udirs register, og om enheten vises i
 * den offentlige skolelisten (lib/schools/classification.ts).
 *
 * Næringskoden finnes bare på enhetens egen side i registeret (`/v4/enhet/<orgnr>`), ikke i
 * listen og ikke i WFS-en syncen leser. Å spørre om alle 3 100 hver gang er unødvendig: listen
 * har `DatoEndret` per enhet. Vi henter derfor enheten bare når
 *
 * - den ikke har rad fra før (ny skole, eller første gangs utfylling),
 * - registeret har endret den siden sist, eller
 * - forrige forsøk ikke ga næringskode.
 *
 * Etter første utfylling er det normalt en håndfull kall per kjøring. Ingenting av dette skjer
 * når en side lastes: `/omrade` leser bare databasen.
 *
 * FEIL SKJULER INGEN. Svarer ikke Udir for en enhet, står den forrige raden urørt; finnes ingen
 * rad, er enheten ukjent og vises offentlig. Svarer ikke listen, gjøres ingenting.
 *
 * Navneregelen regnes om for alle hver gang, uten nettverk, slik at et navnebytte eller en
 * endret regel slår gjennom ved neste kjøring.
 */
const NSR = "https://data-nsr.udir.no/v4";
const PAGE = 1000;

export interface SchoolUnitState {
  orgnr: string;
  title: string;
  primary_nace: string | null;
  nace_codes: string[] | null;
  nsr_changed_at: string | null;
  hidden_reason: string | null;
  rule: string | null;
  has_row: boolean;
}

export interface SchoolRefreshResult {
  schools: number;
  fetched: number;
  failed: number;
  written: number;
  hidden: number;
}

interface NsrDetail {
  Naeringskoder?: { Prioritet?: number; Kode?: string }[] | null;
}

export async function refreshSchoolUnits(
  db: Db,
  options: { fetchImpl?: typeof fetch; retry?: HttpRetryPolicy; limit?: number; concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<SchoolRefreshResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retry = options.retry ?? DEFAULT_RETRY_POLICY;
  const hent = (url: string) => fetchJson(url, { timeoutMs: retry.timeoutMs, retries: retry.maxRetries, baseDelayMs: retry.baseDelayMs, fetchImpl });

  // 1. Skolene våre, med det vi vet fra før. API-et gir høyst 1 000 rader per kall.
  const skoler: SchoolUnitState[] = [];
  for (let fra = 0; ; fra += PAGE) {
    const side = await db.rpc<SchoolUnitState>("school_units_state", {}, { range: [fra, fra + PAGE - 1] });
    skoler.push(...side);
    if (side.length < PAGE) break;
  }

  // 2. Når registeret sist endret hver enhet. Feiler listen, kaster vi: da gjør kjøringen ingenting.
  const endret = new Map<string, string>();
  for (let side = 1; ; side++) {
    const body = (await hent(`${NSR}/enheter?sidenummer=${side}`)) as {
      AntallSider?: number;
      EnhetListe?: { Organisasjonsnummer?: string; DatoEndret?: string }[];
    };
    for (const enhet of body.EnhetListe ?? []) {
      if (enhet.Organisasjonsnummer && enhet.DatoEndret) endret.set(enhet.Organisasjonsnummer, enhet.DatoEndret);
    }
    if (!body.AntallSider || side >= body.AntallSider) break;
  }

  // 3. Hvem må hentes på nytt?
  const tid = (verdi: string | null | undefined) => (verdi ? Date.parse(verdi) : NaN);
  const utdatert = skoler.filter((skole) => {
    if (!skole.has_row || skole.primary_nace === null) return true;
    const iRegister = tid(endret.get(skole.orgnr));
    return Number.isFinite(iRegister) && !(tid(skole.nsr_changed_at) >= iRegister);
  });
  const skalHentes = utdatert.slice(0, options.limit ?? 5000);

  const hentet = new Map<string, { primary: string | null; codes: string[] }>();
  let failed = 0;
  let ferdig = 0;
  const kø = [...skalHentes];
  await Promise.all(
    Array.from({ length: Math.min(options.concurrency ?? 6, kø.length) }, async () => {
      for (let skole = kø.shift(); skole; skole = kø.shift()) {
        try {
          const detalj = (await hent(`${NSR}/enhet/${skole.orgnr}`)) as NsrDetail;
          const koder = [...(detalj.Naeringskoder ?? [])]
            .sort((a, b) => (a.Prioritet ?? 99) - (b.Prioritet ?? 99))
            .flatMap((kode) => (kode.Kode ? [kode.Kode] : []));
          hentet.set(skole.orgnr, { primary: koder[0] ?? null, codes: koder });
        } catch {
          failed += 1;
        }
        options.onProgress?.(++ferdig, skalHentes.length);
      }
    }),
  );

  // 4. Klassifiser alle på nytt, og skriv bare det som faktisk er endret.
  const rader = skoler.flatMap((skole) => {
    const ny = hentet.get(skole.orgnr);
    const primary = ny ? ny.primary : skole.primary_nace;
    const codes = ny ? ny.codes : (skole.nace_codes ?? []);
    const klasse = classifySchool({ name: skole.title, primaryNace: primary });
    const nsrChangedAt = ny ? (endret.get(skole.orgnr) ?? null) : skole.nsr_changed_at;
    const uendret =
      skole.has_row && !ny && klasse.hiddenReason === skole.hidden_reason && klasse.rule === skole.rule;
    // Uten rad og uten svar fra Udir: skriv likevel når navneregelen har noe å si.
    if (uendret || (!skole.has_row && !ny && !klasse.hiddenReason)) return [];
    return [{ orgnr: skole.orgnr, primary_nace: primary, nace_codes: codes, hidden_reason: klasse.hiddenReason, rule: klasse.rule, nsr_changed_at: nsrChangedAt }];
  });

  let written = 0;
  for (let i = 0; i < rader.length; i += 500) {
    const [antall] = await db.rpc<number>("upsert_school_units", { p_rows: rader.slice(i, i + 500) });
    written += antall ?? 0;
  }

  const hidden = skoler.filter((skole) => {
    const ny = hentet.get(skole.orgnr);
    return classifySchool({ name: skole.title, primaryNace: ny ? ny.primary : skole.primary_nace }).hiddenReason !== null;
  }).length;
  return { schools: skoler.length, fetched: hentet.size, failed, written, hidden };
}

export function formatSchoolRefreshResult(r: SchoolRefreshResult): string {
  const deler = [`skolefilter: ${r.hidden} av ${r.schools} skjult offentlig`, `${r.fetched} hentet fra Udir`, `${r.written} rader skrevet`];
  if (r.failed > 0) deler.push(`${r.failed} svarte ikke (prøves igjen neste gang)`);
  return deler.join(", ");
}
