import type { SupabaseClient } from "@supabase/supabase-js";
import { assessAll, type HealthSeverity, type ProviderHealthRow } from "@/lib/sync/health";
import { AREA_CATEGORIES, type AreaCategory } from "@/types/area-feature";

/**
 * Intern kvalitetsoversikt for ett søkepunkt.
 *
 * Svarer på spørsmålet en operatør faktisk har foran seg når noen melder at «noe mangler»:
 * har vi data fra denne kilden i det hele tatt her, og er den fersk? Alt er avledet av
 * tabeller vi allerede har — ingen ny modell, ingen kuratert research.
 *
 * Kalles med admins egen sesjon, så provider_health() håndhever is_admin() selv.
 */

export type Tillit = "hoy" | "middels" | "lav";

export interface KategoriDekning {
  category: AreaCategory;
  antall: number;
  /** Kildene som leverer denne kategorien, og hvor friske de er. */
  kilder: Kilde[];
}

export interface AreaResearch {
  radiusM: number;
  dekning: KategoriDekning[];
  /** Kategorier uten treff her. Kan være riktig, kan være et hull — derfor vises begge deler. */
  tomme: AreaCategory[];
}

export interface Kilde {
  providerId: string;
  navn: string;
  severity: HealthSeverity;
  label: string;
}

interface AntallRad {
  category: string;
  antall: number | string;
}

/**
 * Tilliten til at «ingen treff» faktisk betyr ingenting her.
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

export async function getAreaResearch(
  client: SupabaseClient,
  input: { lat: number; lng: number; radiusM: number },
): Promise<AreaResearch | null> {
  const [antall, helse] = await Promise.all([
    client.rpc("features_count_near", { lat: input.lat, lng: input.lng, radius_m: input.radiusM, categories: null }),
    client.rpc("provider_health"),
  ]);
  if (antall.error || helse.error) return null;

  const perKategori = new Map<string, number>(
    ((antall.data ?? []) as AntallRad[]).map((r) => [r.category, Number(r.antall)]),
  );
  // provider_health() returnerer råe rader. Tilstand og alvorlighet regnes ut i
  // lib/sync/health, samme sted som /admin og varslingen bruker — ellers ville vi hatt to
  // sett med regler for hva «stale» betyr.
  const providere = assessAll((helse.data ?? []) as ProviderHealthRow[])
    .filter((p) => p.row.kind === "area_feature")
    .map(
      (p): Kilde => ({ providerId: p.id, navn: p.name, severity: p.severity, label: p.label }),
    );

  const dekning: KategoriDekning[] = [];
  const tomme: AreaCategory[] = [];
  for (const category of AREA_CATEGORIES) {
    const treff = perKategori.get(category) ?? 0;
    // Hvilke kilder som leverer hvilken kategori er ikke modellert i databasen. Vi viser
    // derfor helsen til alle områdekildene, og lar operatøren koble selv.
    if (treff === 0) tomme.push(category);
    else dekning.push({ category, antall: treff, kilder: providere });
  }

  return { radiusM: input.radiusM, dekning, tomme };
}
