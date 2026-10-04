import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Analysevalg, DatasettInfo, Lagvisning, UtforskVisning } from "@/components/admin/Datautforsker";
import { municipalityNames } from "@/lib/geo/municipalities";
import { hentOmrade, lesUtsnitt, utsnittKm } from "./area";
import { utforskHref } from "./href";
import { tolkSok } from "./parse";
import { datasetMedId, EXPLORE_DATASETS, MAX_LAG } from "./registry";
import type { ExploreArea, ExploreDataset, LngLatBox, OverlapResult } from "./types";

/** Verdien av `analyse` i URL-en når hovedlaget er filtrert mot det andre laget. */
export const OVERLAPP = "overlapp";

/** Større utsnitt enn dette er for mye for et datasett som krever område. */
export const MAKS_UTSNITT_KM = 80;

/** Ordet som velger datasettet når siden selv bygger et søk. */
const sokeord = (d: ExploreDataset) => d.queryWord ?? d.label.toLowerCase();

const overlapper = (a: LngLatBox, b: LngLatBox) => a.minLng <= b.maxLng && a.maxLng >= b.minLng && a.minLat <= b.maxLat && a.maxLat >= b.minLat;

export const datasettInfo = (d: ExploreDataset): DatasettInfo => ({
  id: d.id,
  label: d.label,
  sok: sokeord(d),
  dekning: d.coverage?.label ?? null,
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
  input: { q: string; kommune?: string; utsnitt?: string; lag?: string; analyse?: string },
  hentOmradeFn: typeof hentOmrade = hentOmrade,
): Promise<UtforskVisning> {
  const { q, kommune } = input;
  if (!q) return { status: "tom" };
  const tolkning = tolkSok(q, EXPLORE_DATASETS, await municipalityNames(), kommune);
  const utsnitt = lesUtsnitt(input.utsnitt);
  const hoved = tolkning.dataset;
  if (!hoved) return { status: "ukjent_datasett" };

  if (tolkning.sted.status === "ukjent") return { status: "ukjent_sted", dataset: datasettInfo(hoved), tekst: tolkning.sted.tekst };
  if (tolkning.sted.status === "flertydig") {
    return {
      status: "flertydig_sted",
      dataset: datasettInfo(hoved),
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
      return { status: "feil", dataset: datasettInfo(hoved), melding: `Kunne ikke hente grensen for ${tolkning.sted.sted.name} fra Kartverket akkurat nå.` };
    }
  } else if (utsnitt) {
    const { bredde, hoyde } = utsnittKm(utsnitt);
    const krever = aktive.some((d) => d.needsArea);
    if (!krever || (bredde <= MAKS_UTSNITT_KM && hoyde <= MAKS_UTSNITT_KM)) {
      area = { kind: "utsnitt", name: null, county: null, box: utsnitt, polygon: null };
    }
  }

  if (hoved.needsArea && !area) return { status: "trenger_omrade", dataset: datasettInfo(hoved), utsnitt, maksKm: MAKS_UTSNITT_KM };

  // Lenkene som legger til, fjerner og bytter lag. Bygges her, så komponenten ikke må kjenne URL-reglene.
  // Stedet skrives slik registeret gjør det («Bærum»), så søkefeltet ikke får små bokstaver.
  const sted = tolkning.sted.status === "ok" ? tolkning.sted.sted.name : tolkning.stedTekst;
  const href = (ids: string[], analyse?: string) => {
    const [første, andre] = ids.map((id) => datasetMedId(id)!);
    if (!første) return "/admin/research/utforsk";
    return utforskHref({
      q: [sokeord(første), sted].filter(Boolean).join(" "),
      kommune,
      utsnitt: input.utsnitt,
      lag: andre?.id,
      analyse,
    });
  };

  // «Finn overlapp»: bare for kombinasjoner hovedlaget selv sier at det støtter, og bare med et
  // område. Analysen er asymmetrisk — hovedlaget filtreres, det andre laget er referansen.
  const ref = aktive[1];
  const tekster = ref ? hoved.overlap?.refs[ref.id] : undefined;
  const kanAnalysere = !!ref && !!tekster && !!area;
  const analyserer = kanAnalysere && input.analyse === OVERLAPP;

  // Begge lag leses samtidig, for samme område. Ett kall per lag, ingen dobbelthenting.
  let resultat: OverlapResult | null = null;
  const lag: Lagvisning[] = await Promise.all(
    aktive.map(async (d): Promise<Lagvisning> => {
      const fjernHref = href(aktive.filter((x) => x.id !== d.id).map((x) => x.id));
      if (d.needsArea && !area) {
        return { dataset: datasettInfo(d), features: [], total: 0, feil: null, trengerOmrade: true, fjernHref };
      }
      // Et sted utenfor dekningsområdet er ikke «ingen treff»: dataene finnes ikke der.
      if (area && d.coverage && !overlapper(area.box, d.coverage.box)) {
        return { dataset: datasettInfo(d), features: [], total: 0, feil: null, trengerOmrade: false, fjernHref, utenforDekning: `${d.label} dekker foreløpig bare ${d.coverage.label}.` };
      }
      try {
        // Hovedlaget i «Finn overlapp» leses filtrert, i databasen. Referanselaget leses som
        // vanlig og vises dempet, som kontekst.
        const filtrert = analyserer && d.id === hoved.id ? await hoved.overlap!.load(client, area!, ref!.id) : null;
        if (filtrert) resultat = filtrert;
        const r = filtrert ?? (await d.load(client, area));
        const dempet = analyserer && d.id !== hoved.id;
        return {
          dataset: datasettInfo(d),
          features: r.features.map((f) => ({ ...f, datasetId: d.id, datasetLabel: d.label, ...(dempet ? { muted: true } : {}) })),
          total: r.total,
          feil: r.error,
          trengerOmrade: false,
          fjernHref,
          ...(dempet ? { kontekst: true } : {}),
        };
      } catch (error) {
        return { dataset: datasettInfo(d), features: [], total: 0, feil: error instanceof Error ? error.message : "ukjent feil", trengerOmrade: false, fjernHref };
      }
    }),
  );

  const analysevalg = (): Analysevalg => {
    const ider = aktive.map((d) => d.id);
    const felles = { visSammenHref: href(ider), overlappHref: href(ider, OVERLAPP) };
    if (!kanAnalysere) {
      // Støttes kombinasjonen den andre veien, sier vi det og tilbyr å bytte hovedlag.
      const omvendt = !!area && !!ref!.overlap?.refs[hoved.id];
      return {
        ...felles,
        stottet: false,
        aktiv: false,
        grunn: omvendt
          ? `Finn overlapp går ut fra ${ref!.label.toLowerCase()}.`
          : tekster
            ? "Legg til et sted i søket, eller søk i kartutsnittet, for å finne overlapp."
            : `Finn overlapp er ikke laget for ${hoved.label.toLowerCase()} mot ${ref!.label.toLowerCase()}.`,
        bytt: omvendt ? { label: `Bruk ${ref!.label.toLowerCase()} som hovedlag`, href: href([ref!.id, hoved.id], OVERLAPP) } : null,
        resultat: null,
      };
    }
    if (!analyserer || !resultat || resultat.error) return { ...felles, stottet: true, aktiv: analyserer, grunn: null, bytt: null, resultat: null };
    const { many, one } = hoved.unit;
    const av = resultat.areaTotal;
    return {
      ...felles,
      stottet: true,
      aktiv: true,
      grunn: null,
      bytt: null,
      resultat: {
        tittel: tekster!.title,
        // «10 av 53 plansaker overlapper kartlagt kvikkleiresone». Begge tall: treffene betyr
        // lite uten å vite hvor mange det ble lett blant.
        telling:
          av === 0
            ? `Ingen ${many} i området.`
            : resultat.total === 0
              ? `Ingen av ${av.toLocaleString("nb-NO")} ${many} ${tekster!.predicate}.`
              : `${resultat.total.toLocaleString("nb-NO")} av ${av.toLocaleString("nb-NO")} ${av === 1 ? one : many} ${tekster!.predicate}.`,
        kantnotat:
          resultat.edgeOnly > 0 && tekster!.edgeNote
            ? `${resultat.edgeOnly.toLocaleString("nb-NO")} ${resultat.edgeOnly === 1 ? one : many} til ${tekster!.edgeNote} og er ikke regnet med.`
            : null,
      },
    };
  };

  return {
    status: "treff",
    analyse: ref ? analysevalg() : null,
    omrade: area ? { kind: area.kind, navn: area.name, fylke: area.county, box: area.box } : null,
    lag,
    // Bare når det er plass til et lag til.
    leggTil: aktive.length < MAX_LAG ? EXPLORE_DATASETS.filter((d) => d.id !== hoved.id).map((d) => ({ id: d.id, label: d.label, href: href([hoved.id, d.id]) })) : [],
    utsnittHref: utforskHref({ q: sokeord(hoved), lag: aktive[1]?.id, analyse: analyserer ? OVERLAPP : undefined, utsnitt: "__UTSNITT__" }),
    maksKm: MAKS_UTSNITT_KM,
  };
}
