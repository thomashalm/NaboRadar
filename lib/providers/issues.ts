import type { z } from "zod";

/** Kort, lesbar årsak fra en Zod-feil. Aldri hele payloaden. */
export function describeIssues(error: z.ZodError | undefined | null, fallback = "ukjent valideringsfeil"): string {
  if (!error) return fallback;
  return (
    error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.map(String).join(".") || "(rot)"}: ${issue.message}`)
      .join("; ") || fallback
  );
}
