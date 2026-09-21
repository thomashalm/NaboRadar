import { z } from "zod";

const publicEnvSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(20),
});

export type SupabasePublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Supabase er valgfritt frem til fase 4. Mangler env returneres null,
 * og sider som ikke trenger databasen fungerer som normalt.
 * NEXT_PUBLIC_-variabler må leses som literal for at Next.js skal inline dem i klienten.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const parsed = publicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}

/** Kun server. Returnerer aldri selve nøkkelen til kallere utenfor lib/supabase. */
export function hasSupabaseSecretKey(): boolean {
  return (process.env.SUPABASE_SECRET_KEY ?? "").length >= 20;
}
