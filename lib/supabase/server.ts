import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicEnv, hasSupabaseSecretKey } from "./env";

/**
 * Server-klient med publishable key og brukerens cookies (RLS gjelder).
 * Brukes av server components og route handlers. null hvis Supabase ikke er konfigurert.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Kalt fra en server component — cookies kan ikke settes der. Trygt å ignorere.
        }
      },
    },
  });
}

/**
 * Admin-klient med secret key. Omgår RLS — kun for sync og admin, aldri i kode som når klienten.
 * null hvis ikke konfigurert.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env || !hasSupabaseSecretKey()) return null;
  return createClient(env.url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
