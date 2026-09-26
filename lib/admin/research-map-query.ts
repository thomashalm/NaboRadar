import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gruppeFor, type Kartfilter } from "./research-map-filters";
import type { Level, OperationalStatus, VerificationStatus } from "./research-types";

/**
 * Datauttrekket bak research-kartet.
 *
 * Kaller `research_map` med admins egen sesjon; databasen håndhever `is_admin()` selv. Henter
 * bare feltene kartet og listen viser — beskrivelse, notater og kilder hentes først når et funn
 * åpnes.
 */

export interface Kartpunkt {
  id: string;
  title: string;
  item_type: string;
  category: string;
  subcategory: string | null;
  address: string | null;
  municipality: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  confidence: Level;
  interest_level: Level;
  verification_status: VerificationStatus;
  operational_status: OperationalStatus;
  public_candidate: boolean;
  source_count: number;
  updated_at: string;
}

export interface Kartresultat {
  punkter: Kartpunkt[];
  /** Alle treff, også de uten koordinat. */
  totalt: number;
  medPunkt: number;
  utenPunkt: number;
  /** Underkategoriene som faktisk finnes i dette resultatsettet, til å snevre inn videre. */
  subkategorier: string[];
  /** Kommunene som finnes i resultatsettet. */
  kommuner: string[];
  feil: string | null;
}

const TOMT: Kartresultat = {
  punkter: [],
  totalt: 0,
  medPunkt: 0,
  utenPunkt: 0,
  subkategorier: [],
  kommuner: [],
  feil: null,
};

export async function hentKartpunkter(client: SupabaseClient, filter: Kartfilter): Promise<Kartresultat> {
  const gruppe = gruppeFor(filter.kategori);
  const { data, error } = await client.rpc("research_map", {
    p_search: filter.sok ?? null,
    p_categories: gruppe?.kategorier ?? null,
    // Underkategori fra brukeren vinner over gruppens egen avgrensning.
    p_subcategories: filter.subkategori ? [filter.subkategori] : (gruppe?.subkategorier ?? null),
    p_confidence: filter.confidence,
    p_interest: filter.interesse,
    p_verification: filter.verifisering,
    p_operational: filter.drift,
    p_municipality: filter.kommune ?? null,
    p_public_candidate: filter.kandidat ?? null,
    // Hentes alltid med koordinatløse med: listen skal kunne vise dem, og tellingen trenger dem.
    p_only_with_coords: false,
  });
  if (error) return { ...TOMT, feil: error.message };

  const alle = ((data ?? []) as Kartpunkt[]).map((p) => ({ ...p, source_count: Number(p.source_count) }));
  const medPunkt = alle.filter((p) => p.latitude !== null && p.longitude !== null);

  return {
    punkter: sorter(filter.kunMedPunkt ? medPunkt : alle, filter.sortering),
    totalt: alle.length,
    medPunkt: medPunkt.length,
    utenPunkt: alle.length - medPunkt.length,
    subkategorier: [...new Set(alle.map((p) => p.subcategory).filter((s): s is string => !!s))].sort((a, b) =>
      a.localeCompare(b, "nb"),
    ),
    kommuner: [...new Set(alle.map((p) => p.municipality).filter((s): s is string => !!s))].sort((a, b) =>
      a.localeCompare(b, "nb"),
    ),
    feil: null,
  };
}

const RANG: Record<Level, number> = { high: 0, medium: 1, low: 2 };

/**
 * Sorteringen skjer her og ikke i databasen, fordi valget er en visningsting og fordi
 * resultatsettet er lite nok. Standard er interesse, så sikkerhet, så tittel — avstand gir ikke
 * mening på et nasjonalt kart uten søkepunkt.
 */
function sorter(punkter: Kartpunkt[], sortering: Kartfilter["sortering"]): Kartpunkt[] {
  const ut = [...punkter];
  const navn = (a: Kartpunkt, b: Kartpunkt) => a.title.localeCompare(b.title, "nb");
  switch (sortering) {
    case "sikkerhet":
      return ut.sort((a, b) => RANG[a.confidence] - RANG[b.confidence] || navn(a, b));
    case "nyeste":
      return ut.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    case "navn":
      return ut.sort(navn);
    case "kommune":
      return ut.sort((a, b) => (a.municipality ?? "å").localeCompare(b.municipality ?? "å", "nb") || navn(a, b));
    default:
      return ut.sort(
        (a, b) =>
          RANG[a.interest_level] - RANG[b.interest_level] ||
          RANG[a.confidence] - RANG[b.confidence] ||
          navn(a, b),
      );
  }
}
