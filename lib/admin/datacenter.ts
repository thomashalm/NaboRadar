import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { besteMW, type Datasenter, type Datasentersammendrag, type KøLinje, type RefreshKjøring } from "./datacenter-types";

export * from "./datacenter-types";

/**
 * Datauttrekket bak datasenter-flaten.
 *
 * Holdt utenfor `research-map-query.ts` med vilje: datasenter-enrichment er en egen flyt som skal
 * kunne endres uten å røre research-kartet, og research-kartet skal ikke måtte kjenne til
 * MW-semantikk. Kartet henter bare et lite sammendrag herfra og slår det sammen på id.
 *
 * Kilder og historikk hentes ikke her. De ligger bak `datacenter_detail()`, som kalles først når
 * et enkelt anlegg åpnes — lista skal tåle 500+ anlegg.
 */

/** numeric kommer som streng gjennom PostgREST. */
function tall(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normaliser(rad: Record<string, unknown>): Datasenter {
  return {
    ...(rad as unknown as Datasenter),
    it_load_mw: tall(rad.it_load_mw),
    operational_capacity_mw: tall(rad.operational_capacity_mw),
    secured_power_mw: tall(rad.secured_power_mw),
    planned_capacity_mw: tall(rad.planned_capacity_mw),
    campus_potential_mw: tall(rad.campus_potential_mw),
    investment_nok: tall(rad.investment_nok),
    source_count: tall(rad.source_count) ?? 0,
    missing_fields: (rad.missing_fields as string[] | null) ?? [],
  };
}

export async function hentDatasentre(
  client: SupabaseClient,
  søk?: string | null,
): Promise<{ anlegg: Datasenter[]; feil: string | null }> {
  const { data, error } = await client.rpc("datacenter_items", { p_search: søk ?? null });
  if (error) return { anlegg: [], feil: error.message };
  return { anlegg: ((data ?? []) as Record<string, unknown>[]).map(normaliser), feil: null };
}

export async function hentRefreshKjøringer(
  client: SupabaseClient,
  antall = 10,
): Promise<{ kjøringer: RefreshKjøring[]; feil: string | null }> {
  const { data, error } = await client.rpc("datacenter_refresh_runs", { p_limit: antall });
  if (error) return { kjøringer: [], feil: error.message };
  return { kjøringer: (data ?? []) as RefreshKjøring[], feil: null };
}

export async function hentKø(client: SupabaseClient, runId: string): Promise<KøLinje[]> {
  const { data } = await client.rpc("datacenter_refresh_queue", { p_run_id: runId });
  return (data ?? []) as KøLinje[];
}

/** Hva som *ville* havnet i køen, uten å opprette en kjøring. Tallet står på knappen. */
export async function hentKandidatAntall(client: SupabaseClient): Promise<{ review_due: number; full: number }> {
  const [due, full] = await Promise.all([
    client.rpc("datacenter_refresh_candidates", { p_mode: "review_due" }),
    client.rpc("datacenter_refresh_candidates", { p_mode: "full" }),
  ]);
  return {
    review_due: ((due.data ?? []) as unknown[]).length,
    full: ((full.data ?? []) as unknown[]).length,
  };
}

/**
 * Sammendrag til research-kartet. Ett ekstra kall, og bare når kartet faktisk viser datasentre —
 * `research_map` er felles for hele researchbasen og skal ikke vite om MW.
 */
export async function hentDatasentersammendrag(
  client: SupabaseClient,
): Promise<Map<string, Datasentersammendrag>> {
  const { anlegg } = await hentDatasentre(client);
  return new Map(
    anlegg.map((a) => [
      a.id,
      {
        operators: a.operators,
        owners: a.owners,
        customers: a.customers,
        facility_type: a.facility_type,
        mw: besteMW(a),
        missing_fields: a.missing_fields,
      },
    ]),
  );
}
