"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let client: SupabaseClient | null | undefined;

/** Nettleser-klient (publishable key, RLS). null hvis Supabase ikke er konfigurert. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = getSupabasePublicEnv();
  client = env ? createBrowserClient(env.url, env.publishableKey) : null;
  return client;
}
