import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, hasSupabaseSecretKey } from "@/lib/supabase/env";
import { DatabaseQueryError, type Db } from "./types";

class SupabaseDb implements Db {
  readonly kind = "supabase" as const;
  constructor(private readonly client: SupabaseClient) {}

  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new DatabaseQueryError(fn, error.message);
    if (data === null) return [];
    return (Array.isArray(data) ? data : [data]) as T[];
  }
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Lesing med publishable key — RLS og funksjonsgrants gjelder. */
export function createSupabaseReadDb(): Db | null {
  const env = getSupabasePublicEnv();
  return env ? new SupabaseDb(createClient(env.url, env.publishableKey, clientOptions)) : null;
}

/**
 * Skriving med secret key (omgår RLS). Kun for sync — aldri importert fra klientkode.
 * SUPABASE_SECRET_KEY har ikke NEXT_PUBLIC_-prefiks og kan derfor aldri havne i nettleseren.
 */
export function createSupabaseWriteDb(): Db | null {
  const env = getSupabasePublicEnv();
  if (!env || !hasSupabaseSecretKey()) return null;
  return new SupabaseDb(createClient(env.url, process.env.SUPABASE_SECRET_KEY!, clientOptions));
}
