import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { DatabaseQueryError, type Db } from "./types";

/**
 * Lokal Postgres + PostGIS (PGlite/WASM) for utvikling og tester — samme migrasjoner som Supabase.
 * Brukes aldri i produksjon. PGlite tåler ikke flere prosesser på samme datamappe,
 * derfor en enkel lockfil.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const TEXT_TYPES = { date: 1082, timestamp: 1114, timestamptz: 1184 } as const;

/** Stubber det Supabase har som standard (roller og auth-skjema), kun lokalt. */
const SUPABASE_STUBS = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $f$ select null::uuid $f$;
create schema if not exists local_meta;
create table if not exists local_meta.migrations (name text primary key, applied_at timestamptz not null default now());
`;

export class LocalDatabaseBusyError extends Error {
  constructor(pid: number) {
    super(
      `Den lokale databasen er i bruk av en annen prosess (pid ${pid}). ` +
        "Stopp dev-serveren, eller bruk «Sync now» på /dev.",
    );
    this.name = "LocalDatabaseBusyError";
  }
}

class PgliteDb implements Db {
  readonly kind = "pglite" as const;
  constructor(readonly pg: PGlite) {}

  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> {
    if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw new DatabaseQueryError(fn, "ugyldig funksjonsnavn");
    const names = Object.keys(args);
    for (const name of names) {
      if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new DatabaseQueryError(fn, `ugyldig argument ${name}`);
    }
    // Objekter og arrays av objekter → jsonb (som PostgREST). Arrays av primitiver → Postgres-array.
    const params = names.map((name) => {
      const value = args[name];
      if (value === null || typeof value !== "object") return value;
      if (Array.isArray(value) && value.every((v) => v === null || typeof v !== "object")) return value;
      return JSON.stringify(value);
    });
    const sql = `select * from public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(", ")})`;
    try {
      const result = await this.pg.query<Record<string, unknown>>(sql, params);
      // Skalarfunksjoner returnerer én kolonne med funksjonsnavnet — pakk ut som verdi.
      return result.rows.map((row) => {
        const keys = Object.keys(row);
        return (keys.length === 1 && keys[0] === fn ? row[fn] : row) as T;
      });
    } catch (error) {
      throw new DatabaseQueryError(fn, error instanceof Error ? error.message : String(error));
    }
  }
}

async function applyMigrations(pg: PGlite) {
  await pg.exec(SUPABASE_STUBS);
  const applied = new Set(
    (await pg.query<{ name: string }>("select name from local_meta.migrations")).rows.map((r) => r.name),
  );
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    await pg.transaction(async (tx) => {
      await tx.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      await tx.query("insert into local_meta.migrations (name) values ($1)", [file]);
    });
  }
}

function acquireLock(dataDir: string) {
  const lockFile = `${dataDir}.lock`;
  if (existsSync(lockFile)) {
    const pid = Number(readFileSync(lockFile, "utf8"));
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        throw new LocalDatabaseBusyError(pid);
      } catch (error) {
        if (error instanceof LocalDatabaseBusyError) throw error;
        // Prosessen finnes ikke lenger — gammel lock.
      }
    }
  }
  writeFileSync(lockFile, String(process.pid));
  process.once("exit", () => {
    try {
      if (readFileSync(lockFile, "utf8") === String(process.pid)) rmSync(lockFile);
    } catch {
      // ignorer
    }
  });
}

/** Oppretter en PGlite-database med migrasjoner. Uten dataDir: kun i minnet (tester). */
export async function createPgliteDb(dataDir?: string): Promise<PgliteDb> {
  const [{ PGlite }, { postgis }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite-postgis"),
  ]);
  if (dataDir) {
    mkdirSync(dataDir, { recursive: true });
    acquireLock(dataDir);
  }
  const identity = (value: string) => value;
  const pg = await PGlite.create({
    dataDir,
    extensions: { postgis },
    // Datoer som strenger, likt Supabase/PostgREST.
    parsers: { [TEXT_TYPES.date]: identity, [TEXT_TYPES.timestamp]: identity, [TEXT_TYPES.timestamptz]: identity },
  });
  await applyMigrations(pg);
  return new PgliteDb(pg);
}

export const LOCAL_DATA_DIR = join(process.cwd(), ".data", "pglite");

type GlobalWithDb = typeof globalThis & { __naboradarLocalDb?: Promise<PgliteDb> };

/** Én instans per prosess — også på tvers av hot reload i Next dev. */
export function getLocalDb(): Promise<PgliteDb> {
  const g = globalThis as GlobalWithDb;
  g.__naboradarLocalDb ??= createPgliteDb(LOCAL_DATA_DIR).catch((error) => {
    g.__naboradarLocalDb = undefined;
    throw error;
  });
  return g.__naboradarLocalDb;
}
