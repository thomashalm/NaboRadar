import type { SupabaseClient } from "@supabase/supabase-js";
import { assessAll, type HealthSeverity, type ProviderHealthRow } from "@/lib/sync/health";

/**
 * Kildestatus og datadekning.
 *
 * Uten `server-only`, i motsetning til resten av admin-laget: `tillitFor` er en ren funksjon som
 * testes for seg, og modulen tar databaseklienten som argument i stedet for å hente den selv.
 *
 * Svarer på spørsmålet en operatør har når noe «mangler»: har vi data fra denne kilden i det
 * hele tatt, og er den fersk? Dette lå tidligere i adressevisningen som «Datakvalitet i
 * området», men det er drift- og dekningsinformasjon, ikke et funn — og i en adressevisning
 * konkurrerte det med research. Det hører hjemme i research-oversikten.
 *
 * Kalles med admins egen sesjon, så provider_health() håndhever is_admin() selv.
 */

export type Tillit = "hoy" | "middels" | "lav";

export interface Kilde {
  providerId: string;
  navn: string;
  severity: HealthSeverity;
  label: string;
  /** Antall aktive objekter kilden har levert. */
  objekter: number;
  /** Timer siden sist vi fikk data vi stolte på. */
  alderTimer: number | null;
}

export interface Kildedekning {
  kilder: Kilde[];
  tillit: Tillit;
}

/**
 * Tilliten til at «ingen treff» faktisk betyr ingenting der.
 *
 * Er kilden fersk, er tomt sannsynligvis sant. Er den stale eller feilende, vet vi ikke —
 * og det er nettopp da en operatør ikke skal lese tomt som et svar.
 */
export function tillitFor(kilder: { severity: HealthSeverity }[]): Tillit {
  if (kilder.length === 0) return "lav";
  if (kilder.some((k) => k.severity === "critical")) return "lav";
  if (kilder.some((k) => k.severity === "warning")) return "middels";
  return "hoy";
}

export async function getKildedekning(client: SupabaseClient): Promise<Kildedekning | null> {
  const { data, error } = await client.rpc("provider_health");
  if (error) return null;

  // Tilstand og alvorlighet regnes ut i lib/sync/health, samme sted som /admin og varslingen
  // bruker — ellers ville vi hatt to sett med regler for hva «stale» betyr.
  const kilder = assessAll((data ?? []) as ProviderHealthRow[])
    .filter((p) => p.row.kind === "area_feature")
    .map(
      (p): Kilde => ({
        providerId: p.id,
        navn: p.name,
        severity: p.severity,
        label: p.label,
        objekter: Number(p.row.active_records),
        alderTimer: p.dataAgeHours,
      }),
    )
    .sort((a, b) => b.objekter - a.objekter);

  return { kilder, tillit: tillitFor(kilder) };
}
