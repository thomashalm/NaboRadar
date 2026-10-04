import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatasettInfo, Lagvisning, UtforskVisning } from "@/components/admin/Datautforsker";
import { municipalityNames } from "@/lib/geo/municipalities";
import { hentOmrade, lesUtsnitt, utsnittKm } from "./area";
import { utforskHref } from "./href";
import { tolkSok } from "./parse";
import { datasetMedId, EXPLORE_DATASETS, MAX_LAG } from "./registry";
import type { ExploreArea, ExploreDataset } from "./types";

/** Større utsnitt enn dette er for mye for et datasett som krever område. */
export const MAKS_UTSNITT_KM = 80;

const info = (d: ExploreDataset): DatasettInfo => ({
  id: d.id,
  label: d.label,
  description: d.description,
  unit: d.unit,
  needsArea: d.needsArea,
  pointCheck: d.pointCheck ?? null,
});

/**
 * Fra URL til det siden viser: tolker søket, finner området, leser ett eller to lag.
 *
 * Skilt fra siden for å kunne testes uten en innlogget admin. `client` er admins egen sesjon;
 * databasen håndhever `is_admin()` selv.
 */
export async function byggVisning(
  client: SupabaseClient,
  input: { q: string; kommune?: string; utsnitt?: string; lag?: string },
  hentOmradeFn: typeof hentOmrade = hentOmrade,
): Promise<UtforskVisning> {
  const { q, kommune } = input;
  if (!q) return { status: "tom" };
  const tolkning = tolkSok(q, EXPLORE_DATASETS, await municipalityNames(), kommune);
  const utsnitt = lesUtsnitt(input.utsnitt);
  const hoved = tolkning.dataset;
  if (!hoved) return { status: "ukjent_datasett" };

  if (tolkning.sted.status === "ukjent") return { status: "ukjent_sted", dataset: info(hoved), tekst: tolkning.sted.tekst };
  if (tolkning.sted.status === "flertydig") {
    return {
      status: "flertydig_sted",
      dataset: info(hoved),
      tekst: tolkning.sted.tekst,
      valg: tolkning.sted.valg.map((s) => ({ nummer: s.number, navn: s.name, fylke: s.county })),
    };
  }

  // Det andre laget. Samme datasett to ganger er ikke to lag.
  const ekstra = datasetMedId(input.lag);
  const aktive = [hoved, ...(ekstra && ekstra.id !== hoved.id ? [ekstra] : [])];

  // Området: stedet i søket, ellers kartutsnittet, ellers hele landet (bare for små datasett).
  let area: ExploreArea | null = null;
  if (tolkning.sted.status === "ok") {
    try {
      area = await hentOmradeFn(tolkning.sted.sted);
    } catch {
      return { status: "feil", dataset: info(hoved), melding: `Kunne ikke hente grensen for ${tolkning.sted.sted.name} fra Kartverket akkurat nå.` };
    }
  } else if (utsnitt) {
    const { bredde, hoyde } = utsnittKm(utsnitt);
    const krever = aktive.some((d) => d.needsArea);
    if (!krever || (bredde <= MAKS_UTSNITT_KM && hoyde <= MAKS_UTSNITT_KM)) {
      area = { kind: "utsnitt", name: null, county: null, box: utsnitt, polygon: null };
    }
  }

  if (hoved.needsArea && !area) return { status: "trenger_omrade", dataset: info(hoved), utsnitt, maksKm: MAKS_UTSNITT_KM };

  // Lenkene som legger til, fjerner og bytter lag. Bygges her, så komponenten ikke må kjenne URL-reglene.
  // Stedet skrives slik registeret gjør det («Bærum»), så søkefeltet ikke får små bokstaver.
  const sted = tolkning.sted.status === "ok" ? tolkning.sted.sted.name : tolkning.stedTekst;
  const href = (ids: string[]) => {
    const [første, andre] = ids.map((id) => datasetMedId(id)!);
    if (!første) return "/admin/research/utforsk";
    return utforskHref({
      q: [første.label.toLowerCase(), sted].filter(Boolean).join(" "),
      kommune,
      utsnitt: input.utsnitt,
      lag: andre?.id,
    });
  };

  // Begge lag leses samtidig, for samme område. Ett kall per lag, ingen dobbelthenting.
  const lag: Lagvisning[] = await Promise.all(
    aktive.map(async (d): Promise<Lagvisning> => {
      const fjernHref = href(aktive.filter((x) => x.id !== d.id).map((x) => x.id));
      if (d.needsArea && !area) {
        return { dataset: info(d), features: [], total: 0, feil: null, trengerOmrade: true, fjernHref };
      }
      try {
        const r = await d.load(client, area);
        return {
          dataset: info(d),
          features: r.features.map((f) => ({ ...f, datasetId: d.id, datasetLabel: d.label })),
          total: r.total,
          feil: r.error,
          trengerOmrade: false,
          fjernHref,
        };
      } catch (error) {
        return { dataset: info(d), features: [], total: 0, feil: error instanceof Error ? error.message : "ukjent feil", trengerOmrade: false, fjernHref };
      }
    }),
  );

  return {
    status: "treff",
    omrade: area ? { kind: area.kind, navn: area.name, fylke: area.county, box: area.box } : null,
    lag,
    // Bare når det er plass til et lag til.
    leggTil: aktive.length < MAX_LAG ? EXPLORE_DATASETS.filter((d) => d.id !== hoved.id).map((d) => ({ id: d.id, label: d.label, href: href([hoved.id, d.id]) })) : [],
    utsnittHref: utforskHref({ q: hoved.label.toLowerCase(), lag: aktive[1]?.id, utsnitt: "__UTSNITT__" }),
    maksKm: MAKS_UTSNITT_KM,
  };
}
