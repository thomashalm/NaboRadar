import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { geocoder } from "@/lib/geocoding";
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

export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const probes = await probeGeocoding();
  const map = getMapTileConfig();
  const supabase = getSupabasePublicEnv();

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-sm font-medium text-muted">Kun synlig i development</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Diagnostikk</h1>

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
        <p className="mt-3 text-sm text-muted">Verdiene vises aldri. Søk og kart fungerer uten Supabase i fase 3.</p>
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

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2.5 pr-4">{children}</td>;
}

function Status({ ok, okText = "OK", failText = "Feil" }: { ok: boolean; okText?: string; failText?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${ok ? "text-ink" : "text-danger"}`}>
      <span className={`size-2 rounded-full ${ok ? "bg-emerald-600" : "bg-danger"}`} aria-hidden="true" />
      {ok ? okText : failText}
    </span>
  );
}
