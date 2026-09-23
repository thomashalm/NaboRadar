import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SyncPanel } from "@/components/dev/SyncPanel";
import { areaLookups } from "@/lib/facts/lookups";
import { getDbMode, getWriteDb } from "@/lib/db";
import { geocoder } from "@/lib/geocoding";
import { formatDate } from "@/lib/format";
import { getMapTileConfig } from "@/lib/map/config";
import { providers } from "@/lib/providers/registry";
import { getSupabasePublicEnv, hasSupabaseSecretKey } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Utvikler", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Faste testsøk mot offentlige steder — aldri brukerdata. */
const PROBE_QUERIES = ["Sognsvann", "Karl Johans gate 1"];

async function probeGeocoding() {
  return Promise.all(
    PROBE_QUERIES.map(async (query) => {
      const started = performance.now();
      try {
        const result = await geocoder.searchDetailed(query, { limit: 3 });
        return { query, ok: true, ms: Math.round(performance.now() - started), ...result, error: null };
      } catch (error) {
        return {
          query,
          ok: false,
          ms: Math.round(performance.now() - started),
          results: [],
          sources: { address: "error", place: "error" } as const,
          cached: false,
          error: error instanceof Error ? error.name : "Ukjent feil",
        };
      }
    }),
  );
}

interface ProviderOverviewRow {
  id: string;
  kind: string;
  status: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  active_events: number | string;
  removed_events: number | string;
  documents: number | string;
  active_features: number | string;
  removed_features: number | string;
  last_run: { status: string; mode: string; fetched: number; accepted: number; rejected: number; inserted: number; updated: number; unchanged: number; removed: number; failed: number; started_at: string } | null;
}

async function loadProviderOverview(): Promise<{ rows: ProviderOverviewRow[] } | { error: string }> {
  try {
    const db = await getWriteDb();
    if (!db) return { error: getDbMode() === "supabase" ? "SUPABASE_SECRET_KEY mangler" : "Ingen database konfigurert" };
    return { rows: await db.rpc<ProviderOverviewRow>("provider_overview") };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ukjent feil" };
  }
}

function formatTime(value: string | null) {
  if (!value) return "aldri";
  return `${formatDate(value)} ${new Date(value).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const [probes, overview] = await Promise.all([probeGeocoding(), loadProviderOverview()]);
  const rows = "rows" in overview ? overview.rows : [];
  const dibk = rows.find((r) => r.id === "dibk-planning-started");
  const areaRows = rows.filter((r) => r.kind === "area_feature");
  const dbMode = getDbMode();
  const map = getMapTileConfig();
  const supabase = getSupabasePublicEnv();

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-sm font-medium text-muted">Kun synlig i development</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Diagnostikk</h1>

      <Section title="DiBK Planlegging igangsatt">
        {"error" in overview ? (
          <p className="text-sm text-danger">Databasen er ikke tilgjengelig: {overview.error}</p>
        ) : dibk ? (
          <dl className="grid grid-cols-[12rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Status</dt>
            <dd>{dibk.status}</dd>
            <dt className="text-muted">Last sync</dt>
            <dd>{formatTime(dibk.last_sync_at)}{dibk.last_run ? ` (${dibk.last_run.mode}, ${dibk.last_run.status})` : ""}</dd>
            <dt className="text-muted">Last success</dt>
            <dd>{formatTime(dibk.last_success_at)}</dd>
            <dt className="text-muted">Events</dt>
            <dd>{Number(dibk.active_events).toLocaleString("nb-NO")} aktive · {Number(dibk.removed_events).toLocaleString("nb-NO")} fjernet fra kilden</dd>
            <dt className="text-muted">Dokumenter</dt>
            <dd>{Number(dibk.documents).toLocaleString("nb-NO")}</dd>
            <dt className="text-muted">Rejected last run</dt>
            <dd>{dibk.last_run ? dibk.last_run.rejected : "–"}</dd>
            {dibk.last_run && (
              <>
                <dt className="text-muted">Siste kjøring</dt>
                <dd className="font-mono text-xs">
                  fetched {dibk.last_run.fetched} · inserted {dibk.last_run.inserted} · updated {dibk.last_run.updated} · unchanged{" "}
                  {dibk.last_run.unchanged} · removed {dibk.last_run.removed} · failed {dibk.last_run.failed}
                </dd>
              </>
            )}
            {dibk.last_error && (
              <>
                <dt className="text-muted">Siste feil</dt>
                <dd className="whitespace-pre-wrap text-danger">{dibk.last_error}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted">Ingen provider-rad funnet — er migrasjonene kjørt?</p>
        )}
        <SyncPanel />
      </Section>

      <Section title="Områdefakta (area_features)">
        {"error" in overview ? (
          <p className="text-sm text-danger">Databasen er ikke tilgjengelig: {overview.error}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <Th>Provider</Th>
                <Th>Objekter</Th>
                <Th>Siste sync</Th>
                <Th>Siste kjøring</Th>
              </tr>
            </thead>
            <tbody>
              {areaRows.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <Td>
                    <span className="font-mono text-xs">{row.id}</span>
                  </Td>
                  <Td>
                    {Number(row.active_features).toLocaleString("nb-NO")}
                    {Number(row.removed_features) > 0 ? ` (+${Number(row.removed_features)} fjernet)` : ""}
                  </Td>
                  <Td>{formatTime(row.last_sync_at)}</Td>
                  <Td className="font-mono text-xs">
                    {row.last_run
                      ? `${row.last_run.status} · ins ${row.last_run.inserted} · upd ${row.last_run.updated} · unch ${row.last_run.unchanged} · rem ${row.last_run.removed} · fail ${row.last_run.failed}`
                      : "–"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <SyncPanel target="area" />
        <p className="mt-4 text-sm text-muted">
          Direkte oppslag per søk (ikke synket): {areaLookups.map((l) => l.id).join(", ")}.
        </p>
      </Section>

      <Section title="Kartverket geokoding">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <Th>Testsøk</Th>
              <Th>Adresse-API</Th>
              <Th>Stedsnavn-API</Th>
              <Th>Tid</Th>
              <Th>Første treff</Th>
            </tr>
          </thead>
          <tbody>
            {probes.map((probe) => (
              <tr key={probe.query} className="border-t border-line">
                <Td>{probe.query}</Td>
                <Td><Status ok={probe.sources.address === "ok"} /></Td>
                <Td><Status ok={probe.sources.place === "ok"} /></Td>
                <Td>{probe.cached ? "cache" : `${probe.ms} ms`}</Td>
                <Td>{probe.results[0] ? `${probe.results[0].label} (${probe.results[0].subtitle})` : (probe.error ?? "–")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Kartkonfig">
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Tile-URL</dt>
          <dd className="font-mono text-xs break-all">{map.tileUrl}</dd>
          <dt className="text-muted">Attribution</dt>
          <dd>{map.attribution}</dd>
          <dt className="text-muted">Kilde</dt>
          <dd>{process.env.NEXT_PUBLIC_MAP_TILE_URL ? "NEXT_PUBLIC_MAP_TILE_URL" : "standard (Kartverket topograatone)"}</dd>
        </dl>
      </Section>

      <Section title="Database">
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">I bruk</dt>
          <dd>
            {dbMode === "supabase"
              ? "Hosted Supabase"
              : dbMode === "pglite"
                ? "Lokal PGlite (.data/pglite) — kun development"
                : "Ingen — resultatsiden viser «Vi får ikke hentet plansaker»"}
          </dd>
        </dl>
      </Section>

      <Section title="Supabase">
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">URL + publishable key</dt>
          <dd><Status ok={supabase !== null} okText="Konfigurert" failText="Mangler" /></dd>
          <dt className="text-muted">Secret key</dt>
          <dd><Status ok={hasSupabaseSecretKey()} okText="Konfigurert" failText="Mangler" /></dd>
          {supabase && (
            <>
              <dt className="text-muted">Prosjekt</dt>
              <dd className="font-mono text-xs">{new URL(supabase.url).host}</dd>
            </>
          )}
        </dl>
        <p className="mt-3 text-sm text-muted">Verdiene vises aldri. Uten Supabase brukes lokal PGlite (LOCAL_DATABASE=pglite) i development.</p>
      </Section>

      <Section title="Providers (registry)">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <Th>ID</Th>
              <Th>Status</Th>
              <Th>Begrunnelse</Th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.id} className="border-t border-line align-top">
                <Td>
                  <span className="font-medium">{provider.name}</span>
                  <span className="block font-mono text-xs text-muted">{provider.id}</span>
                </Td>
                <Td>{provider.defaultStatus}</Td>
                <Td>{provider.statusReason ?? "–"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-5">{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pr-4 pb-2 font-medium">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2.5 pr-4 ${className}`}>{children}</td>;
}

function Status({ ok, okText = "OK", failText = "Feil" }: { ok: boolean; okText?: string; failText?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${ok ? "text-ink" : "text-danger"}`}>
      <span className={`size-2 rounded-full ${ok ? "bg-emerald-600" : "bg-danger"}`} aria-hidden="true" />
      {ok ? okText : failText}
    </span>
  );
}
