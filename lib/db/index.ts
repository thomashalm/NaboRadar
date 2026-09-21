import { getSupabasePublicEnv, hasSupabaseSecretKey } from "@/lib/supabase/env";
import { createSupabaseReadDb, createSupabaseWriteDb } from "./supabase";
import type { Db } from "./types";

export type DbMode = "supabase" | "pglite" | "none";

/**
 * Hvilken database appen bruker:
 * 1. Supabase hvis NEXT_PUBLIC_SUPABASE_URL + publishable key er satt
 * 2. lokal PGlite hvis LOCAL_DATABASE=pglite og vi ikke kjører i produksjon
 * 3. ingen — sider viser «Vi får ikke hentet plansaker akkurat nå.»
 */
export function getDbMode(): DbMode {
  if (getSupabasePublicEnv()) return "supabase";
  if (process.env.LOCAL_DATABASE === "pglite" && process.env.NODE_ENV !== "production") return "pglite";
  return "none";
}

async function localDb(): Promise<Db> {
  const { getLocalDb } = await import("./pglite");
  return getLocalDb();
}

export async function getReadDb(): Promise<Db | null> {
  const mode = getDbMode();
  if (mode === "supabase") return createSupabaseReadDb();
  if (mode === "pglite") return localDb();
  return null;
}

/** Skrivetilgang for sync. Supabase krever secret key. */
export async function getWriteDb(): Promise<Db | null> {
  const mode = getDbMode();
  if (mode === "supabase") return hasSupabaseSecretKey() ? createSupabaseWriteDb() : null;
  if (mode === "pglite") return localDb();
  return null;
}

export { DatabaseQueryError, DatabaseUnavailableError, type Db } from "./types";
