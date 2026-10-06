/**
 * Kjernen i `npm run research:seed`: legger inn og oppdaterer de kuraterte research-funnene.
 *
 * Skilt fra kommandoen (scripts/seed-research.ts) for å kunne testes mot PGlite.
 *
 * SEED ER IKKE REVIEW. Seeden skriver innhold for alle funn i fila, hver gang. En review sier at
 * noen faktisk har kontrollert funnet, og registreres bare for funn som er uttrykkelig merket
 * med runden: `gjennomgatt_i: "<rundeetikett>"` på funnet i funn.ts. At et funn står i fila, er
 * aldri nok.
 *
 * Bakgrunn: til og med runde 17 (2026-10-06) logget `--review` en review for hvert funn som
 * fantes i basen. Runde 16 og 17 ga da 278 og 269 funn en «gjennomgått uten endring» de aldri
 * hadde fått. Se docs/research/research-review-opprydding.md.
 */
import type { Funn } from "./funn";

/** Det seeden trenger av en databaseklient. `pg.Client` og PGlite passer begge. */
export interface SeedKlient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface SeedLinje {
  tittel: string;
  adresse: string | null;
  ny: boolean;
  /** Feltene som faktisk endret seg. Tom for nye funn og for uendrede. */
  endringer: string[];
  nyeKilder: number;
  /** "logget", "fantes" (reviewen for runden var registrert fra før) eller null (ikke merket). */
  review: "logget" | "fantes" | null;
}

export interface SeedResultat {
  linjer: SeedLinje[];
  nye: number;
  endret: number;
  uendret: number;
  reviewLogget: number;
  reviewFantes: number;
}

export class SeedReviewFeil extends Error {}

/** Funnene som er merket som gjennomgått i runden. */
export const merketForRunde = (funn: readonly Funn[], runde: string) => funn.filter((f) => f.gjennomgatt_i === runde);

/**
 * Kjører seeden. Med `runde` registreres i tillegg en review for funnene som er merket med den.
 *
 * FEILER FØR NOE SKRIVES når runden er oppgitt, men ikke finnes i basen, eller når ingen funn
 * er merket med den. Det finnes ingen vei der en runde uten merkede funn blir til en review av
 * alt.
 */
export async function kjorSeed(client: SeedKlient, funnliste: readonly Funn[], valg: { runde?: string | null } = {}): Promise<SeedResultat> {
  const runde = valg.runde?.trim() || null;
  let runId: string | null = null;
  if (runde) {
    const merket = merketForRunde(funnliste, runde);
    if (merket.length === 0) {
      throw new SeedReviewFeil(
        `--review="${runde}": ingen funn er merket med gjennomgatt_i for denne runden. ` +
          `Ingenting er skrevet. Merk funnene som faktisk ble kontrollert, eller kjør uten --review.`,
      );
    }
    const { rows } = await client.query<{ id: string }>(
      `select id from admin_research_runs where label = $1 order by started_at desc limit 1`,
      [runde],
    );
    if (rows.length === 0) throw new SeedReviewFeil(`Fant ingen research-run med etiketten «${runde}». Ingenting er skrevet.`);
    runId = rows[0]!.id;
  }

  const resultat: SeedResultat = { linjer: [], nye: 0, endret: 0, uendret: 0, reviewLogget: 0, reviewFantes: 0 };
  for (const funn of funnliste) {
    /*
     * Gjenkjenning: tittel + adresse først, og tittel alene som reserve.
     *
     * Reserven finnes fordi et funn kan få adresse etter at det ble lagt inn — da ville en
     * ren tittel+adresse-nøkkel opprettet en dublett i stedet for å oppdatere raden. Den
     * brukes bare når nøyaktig én rad har tittelen, så to ulike steder med samme navn ikke
     * smelter sammen.
     */
    let finnes = await client.query<{ id: string }>(
      `select id from admin_research_items where title = $1 and coalesce(address, '') = coalesce($2, '')`,
      [funn.title, funn.address ?? null],
    );
    if (finnes.rows.length === 0) {
      const påTittel = await client.query<{ id: string }>(`select id from admin_research_items where title = $1`, [funn.title]);
      if (påTittel.rows.length === 1) finnes = påTittel;
    }
    if (finnes.rows.length === 0 && funn.tidligere_titler?.length) {
      const påGammelTittel = await client.query<{ id: string }>(
        `select id from admin_research_items where title = any($1)`,
        [funn.tidligere_titler],
      );
      if (påGammelTittel.rows.length === 1) finnes = påGammelTittel;
    }

    const ny = !finnes.rows[0];
    const id = finnes.rows[0]?.id ?? (await settInn(client, funn));
    let endringer: string[] = [];
    if (!ny) {
      const før = await hentFelter(client, id);
      await oppdater(client, id, funn);
      endringer = forskjeller(før, funn);
    }

    let nyeKilder = 0;
    for (const kilde of funn.kilder) {
      const harKilden = await client.query(
        `select 1 from admin_research_sources where research_item_id = $1 and source_name = $2`,
        [id, kilde.source_name],
      );
      if (harKilden.rows.length > 0) continue;
      await client.query(
        `insert into admin_research_sources (
           research_item_id, source_name, source_url, publisher, source_type, source_date,
           primary_source, supports_claim, excerpt_or_summary
         ) values ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)`,
        [
          id,
          kilde.source_name,
          kilde.source_url ?? null,
          kilde.publisher ?? null,
          kilde.source_type,
          kilde.source_date ?? null,
          kilde.primary_source ?? false,
          kilde.supports_claim ?? true,
          kilde.excerpt_or_summary ?? null,
        ],
      );
      nyeKilder += 1;
    }

    /*
     * Review: bare for funn som er merket med akkurat denne runden. Finnes reviewen for
     * (funn, runde) fra før, logges den ikke på nytt — seeden skal kunne kjøres to ganger.
     */
    let review: SeedLinje["review"] = null;
    if (runId && runde && funn.gjennomgatt_i === runde) {
      const fraFør = await client.query(
        `select 1 from admin_research_reviews where research_item_id = $1 and research_run_id = $2 limit 1`,
        [id, runId],
      );
      if (fraFør.rows.length > 0) {
        review = "fantes";
        resultat.reviewFantes += 1;
      } else {
        await loggReview(client, id, runId, endringer, nyeKilder);
        review = "logget";
        resultat.reviewLogget += 1;
      }
    }

    if (ny) resultat.nye += 1;
    else if (endringer.length > 0 || nyeKilder > 0) resultat.endret += 1;
    else resultat.uendret += 1;
    resultat.linjer.push({ tittel: funn.title, adresse: funn.address ?? null, ny, endringer, nyeKilder, review });
  }
  return resultat;
}

async function settInn(client: SeedKlient, funn: Funn): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into admin_research_items (
           item_type, category, subcategory, title, description,
           municipality, address, postal_code, city, latitude, longitude, geom,
           verification_status, operational_status, sensitivity, confidence, interest_level,
           why_interesting, notes, created_by, public_candidate, public_candidate_note
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           case when $10::double precision is not null
             then extensions.st_setsrid(extensions.st_makepoint($11, $10), 4326) end,
           $12, $13, $14, $15, $16, $17, $18, 'seed', $19, $20
         ) returning id`,
    [
      funn.item_type,
      funn.category,
      funn.subcategory ?? null,
      funn.title,
      funn.description,
      funn.municipality ?? null,
      funn.address ?? null,
      funn.postal_code ?? null,
      funn.city ?? null,
      funn.latitude ?? null,
      funn.longitude ?? null,
      funn.verification_status,
      funn.operational_status,
      funn.sensitivity,
      funn.confidence,
      funn.interest_level,
      funn.why_interesting ?? null,
      funn.notes ?? null,
      funn.public_candidate ?? false,
      funn.public_candidate_note ?? null,
    ],
  );
  return rows[0]!.id;
}

/** Setter feltene til det som står i skriptet. Kilder røres ikke her. */
async function oppdater(
  client: SeedKlient,
  id: string,
  funn: Funn,
): Promise<void> {
  await client.query(
    `update admin_research_items set
       item_type = $2, category = $3, subcategory = $4, description = $5,
       municipality = $6, postal_code = $7, city = $8, latitude = $9, longitude = $10,
       address = $18, title = $19,
       public_candidate = $20, public_candidate_note = $21,
       geom = case when $9::double precision is not null
                then extensions.st_setsrid(extensions.st_makepoint($10, $9), 4326) end,
       verification_status = $11, operational_status = $12, sensitivity = $13,
       confidence = $14, interest_level = $15, why_interesting = $16, notes = $17,
       updated_at = now()
     where id = $1`,
    [
      id,
      funn.item_type,
      funn.category,
      funn.subcategory ?? null,
      funn.description,
      funn.municipality ?? null,
      funn.postal_code ?? null,
      funn.city ?? null,
      funn.latitude ?? null,
      funn.longitude ?? null,
      funn.verification_status,
      funn.operational_status,
      funn.sensitivity,
      funn.confidence,
      funn.interest_level,
      funn.why_interesting ?? null,
      funn.notes ?? null,
      funn.address ?? null,
      funn.title,
      funn.public_candidate ?? false,
      funn.public_candidate_note ?? null,
    ],
  );
}

/** Feltene vi sammenligner for å avgjøre om oppdateringen faktisk endret noe. */
const SAMMENLIGN = [
  "title",
  "description",
  "notes",
  "why_interesting",
  "operational_status",
  "verification_status",
  "confidence",
  "interest_level",
  "subcategory",
  "municipality",
  "address",
  "latitude",
  "public_candidate",
] as const;

type Felter = Record<string, unknown>;

async function hentFelter(client: SeedKlient, id: string): Promise<Felter> {
  const { rows } = await client.query<Felter>(
    `select ${SAMMENLIGN.join(", ")} from admin_research_items where id = $1`,
    [id],
  );
  return rows[0] ?? {};
}

/**
 * Hva som endret seg. Brukes både til `changed` på reviewen og til sammendraget, slik at
 * historikken kan svare på «hva var forskjellen» uten en generell diffmotor.
 */
function forskjeller(før: Felter, funn: Funn): string[] {
  const etter: Felter = {
    title: funn.title,
    description: funn.description,
    notes: funn.notes ?? null,
    why_interesting: funn.why_interesting ?? null,
    operational_status: funn.operational_status,
    verification_status: funn.verification_status,
    confidence: funn.confidence,
    interest_level: funn.interest_level,
    subcategory: funn.subcategory ?? null,
    municipality: funn.municipality ?? null,
    address: funn.address ?? null,
    latitude: funn.latitude ?? null,
    public_candidate: funn.public_candidate ?? false,
  };
  return SAMMENLIGN.filter((felt) => {
    const a = før[felt];
    const b = etter[felt];
    // Tall fra Postgres kommer som streng; sammenlign som tekst for å slippe falske treff.
    return (a === null || a === undefined ? "" : String(a)) !== (b === null || b === undefined ? "" : String(b));
  });
}

/**
 * Registrerer reviewen gjennom databasens egen funksjon.
 *
 * Kjernen brukes med vilje: den holder streak, datoer og historikk i takt. Skriptet kjører som
 * eier uten JWT, så den tilgangssjekkede innpakningen ville avvist det — og å låne en admins
 * e-post for å komme gjennom ville gjort historikken feil. Aktøren er «seed».
 */
async function loggReview(
  client: SeedKlient,
  id: string,
  runId: string,
  endringer: string[],
  nyeKilder: number,
): Promise<void> {
  const endret = endringer.length > 0 || nyeKilder > 0;
  const hva = [...endringer, ...(nyeKilder ? [`${nyeKilder} ${nyeKilder === 1 ? "ny kilde" : "nye kilder"}`] : [])];
  await client.query(`select public.record_research_review_unchecked($1, $2::jsonb, 'seed')`, [
    id,
    JSON.stringify({
      outcome: endret ? "updated" : "unchanged",
      research_run_id: runId,
      sources_checked: nyeKilder,
      summary: endret
        ? `Gjennomgått i runden. Oppdatert fra seeden: ${hva.join(", ")}.`
        : "Gjennomgått i runden uten at innholdet endret seg.",
    }),
  ]);
}
