import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Tilgang til /admin.
 *
 * Innlogging er Supabase Auth med brukerens egen sesjon (publishable key + cookies).
 * Webappen har bevisst ingen skrivenøkkel: admin-funksjonene i databasen sjekker selv
 * at kalleren står i admin_users, så en innlogget ikke-admin får ingenting ut.
 */
export type AdminSession =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-admin"; email: string }
  | { state: "admin"; email: string; client: SupabaseClient };

export async function getAdminSession(): Promise<AdminSession> {
  const client = await createSupabaseServerClient();
  if (!client) return { state: "unconfigured" };

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { state: "signed-out" };
  const email = data.user.email ?? "";

  // Sannheten ligger i databasen, ikke i en liste i koden.
  const { data: isAdmin, error: adminError } = await client.rpc("is_admin");
  if (adminError || isAdmin !== true) return { state: "not-admin", email };

  return { state: "admin", email, client };
}
