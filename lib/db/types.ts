/**
 * Minimal databaseabstraksjon: all logikk ligger i SQL-funksjoner (supabase/migrations),
 * og appen kaller dem via rpc(). Samme kall fungerer mot hosted Supabase og lokal PGlite.
 */
export type DbKind = "supabase" | "pglite";

export interface Db {
  readonly kind: DbKind;
  /** Kaller public.<fn>(navngitte argumenter) og returnerer radene. */
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T[]>;
}

export class DatabaseUnavailableError extends Error {
  constructor(message = "Databasen er ikke konfigurert") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

export class DatabaseQueryError extends Error {
  constructor(
    readonly fn: string,
    message: string,
  ) {
    super(`${fn}: ${message}`);
    this.name = "DatabaseQueryError";
  }
}
