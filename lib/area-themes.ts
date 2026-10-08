import { eventCountLabel, eventEmptyParts } from "@/lib/events/summary";
import type { AreaEventsResult } from "@/lib/events/queries";
import { assembleSection } from "@/lib/facts/assemble";
import type { AreaFactsResult, FactCluster } from "@/lib/facts/queries";
import { DEFAULT_ANNOUNCED_WITHIN_MONTHS } from "@/lib/geo/constants";
import { AREA_SECTIONS, SAKER_SECTION_ID, sectionWaitsForLookups, type AreaCategory } from "@/types/area-feature";

/**
 * Temaene på resultatsiden.
 *
 * Et tema er det brukeren velger i oversikten og ser i kartet: støy, planer, skoler. Seksjonene
 * (types/area-feature.ts) er hvordan dataene er ordnet; temaene er hvordan de utforskes. Ett tema
 * er enten en hel seksjon, én gruppe i «Nærområdet», plansakene eller friluft.
 *
 * Temafargen kobler raden i panelet til markørene i kartet. Den sier hvilket tema noe hører til —
 * aldri om det er bra eller dårlig. Fargene står også i app/globals.css (`--color-tema-*`).
 *
 * Et nytt tema — byggesaker, for eksempel — er én rad i TEMAER og én kilde. Panelet, kartfilteret
 * og URL-en følger av seg selv.
 */
export type ThemeSource =
  | { kind: "section"; sectionId: string; clusterId?: string }
  | { kind: "saker" }
  | { kind: "friluft" };

export interface Theme {
  id: string;
  label: string;
  color: string;
  /** Ikonnøkkel (components/area/ThemeIcon.tsx). */
  icon: string;
  source: ThemeSource;
  /** Kartkategoriene temaet eier. Tom liste: temaet har ingen punkter i kartet. */
  categories: readonly AreaCategory[];
  /** Vises i den første gruppen i oversikten. De øvrige står under «Mer i området». */
  primary: boolean;
}

export const THEME_COLORS = {
  stoy: "#b8690f",
  naturfare: "#7a4fa3",
  planer: "#2b5fb0",
  skole: "#0d7a6b",
  infrastruktur: "#8f7412",
  helse: "#9b3a55",
  servering: "#a8552f",
  anlegg: "#5a6472",
  friluft: "#3f7d3a",
  tilfluktsrom: "#3d4f6b",
  annet: "#5a6472",
} as const;

export const NAEROMRADET = "naeromradet";

const TEMAER: readonly Theme[] = [
  { id: "stoy", label: "Støy", color: THEME_COLORS.stoy, icon: "stoy", source: { kind: "section", sectionId: "stoy" }, categories: ["stoy"], primary: true },
  { id: "naturfare", label: "Naturfare", color: THEME_COLORS.naturfare, icon: "naturfare", source: { kind: "section", sectionId: "grunnforhold" }, categories: ["grunnforhold"], primary: true },
  { id: "planer", label: "Planer", color: THEME_COLORS.planer, icon: "planer", source: { kind: "saker" }, categories: [], primary: true },
  { id: "skoler", label: "Skoler og barnehager", color: THEME_COLORS.skole, icon: "skole", source: { kind: "section", sectionId: NAEROMRADET, clusterId: "skoler-og-barnehager" }, categories: ["oppvekst"], primary: true },
  { id: "infrastruktur", label: "Infrastruktur", color: THEME_COLORS.infrastruktur, icon: "infrastruktur", source: { kind: "section", sectionId: "infrastruktur" }, categories: ["infrastruktur"], primary: true },
  { id: "helse", label: "Helse og omsorg", color: THEME_COLORS.helse, icon: "helse", source: { kind: "section", sectionId: NAEROMRADET, clusterId: "helse" }, categories: ["helse", "omsorg"], primary: false },
  { id: "servering", label: "Servering og uteliv", color: THEME_COLORS.servering, icon: "servering", source: { kind: "section", sectionId: NAEROMRADET, clusterId: "servering" }, categories: ["servering"], primary: false },
  { id: "anlegg", label: "Virksomheter og anlegg", color: THEME_COLORS.anlegg, icon: "anlegg", source: { kind: "section", sectionId: NAEROMRADET, clusterId: "virksomheter-og-anlegg" }, categories: ["industri"], primary: false },
  { id: "friluft", label: "Friluft", color: THEME_COLORS.friluft, icon: "friluft", source: { kind: "friluft" }, categories: [], primary: false },
  { id: "tilfluktsrom", label: "Tilfluktsrom", color: THEME_COLORS.tilfluktsrom, icon: "tilfluktsrom", source: { kind: "section", sectionId: "tilfluktsrom" }, categories: ["tilfluktsrom"], primary: false },
];

const PLASSERTE_SEKSJONER = new Set(
  TEMAER.flatMap((t) => (t.source.kind === "section" && !t.source.clusterId ? [t.source.sectionId] : [])),
);
const PLASSERTE_GRUPPER = new Set(
  TEMAER.flatMap((t) => (t.source.kind === "section" && t.source.clusterId ? [t.source.clusterId] : [])),
);

/**
 * Temaene for ett søk, i visningsrekkefølge.
 *
 * De faste temaene kommer først. En seksjon eller en gruppe i Nærområdet som ikke har fått et
 * eget tema ennå — en ny stedstype, eller en intern seksjon i admins visning — får et generisk
 * tema, så ingenting forsvinner. En seksjon serveren har løftet først (admin: forurenset grunn
 * under søkepunktet) står øverst.
 */
export function themesFor(stored: AreaFactsResult | null): Theme[] {
  if (stored === null || stored.status !== "ok") return [...TEMAER];
  const order = stored.order;
  const known = new Set(order);
  const faste = TEMAER.filter((t) => t.source.kind !== "section" || known.has(t.source.sectionId));

  const ekstraSeksjoner = order
    .filter((id) => id !== SAKER_SECTION_ID && id !== NAEROMRADET && !PLASSERTE_SEKSJONER.has(id))
    .map((sectionId): Theme => ({
      id: sectionId,
      label: AREA_SECTIONS.find((s) => s.id === sectionId)?.label ?? sectionId,
      color: THEME_COLORS.annet,
      icon: "annet",
      source: { kind: "section", sectionId },
      categories: AREA_SECTIONS.find((s) => s.id === sectionId)?.categories ?? [],
      primary: false,
    }));
  const ekstraGrupper = stored.groups
    .filter((g) => g.sectionId === NAEROMRADET)
    .flatMap((g) => g.clusters)
    .filter((c) => !PLASSERTE_GRUPPER.has(c.id))
    .map((c): Theme => ({
      id: c.id,
      label: c.label,
      color: THEME_COLORS.annet,
      icon: "annet",
      source: { kind: "section", sectionId: NAEROMRADET, clusterId: c.id },
      categories: [],
      primary: false,
    }));

  const lofted = order[0] !== undefined ? ekstraSeksjoner.filter((t) => t.id === order[0]) : [];
  return [...lofted.map((t) => ({ ...t, primary: true })), ...faste, ...ekstraSeksjoner.filter((t) => !lofted.includes(t)), ...ekstraGrupper];
}

/** Temaet en id i URL-en peker på. Ukjent id gir null, og siden viser oversikten. */
export function findTheme(themes: readonly Theme[], id: string | null | undefined): Theme | null {
  return id ? (themes.find((t) => t.id === id) ?? null) : null;
}

/** Om temaet trenger de direkte oppslagene (støy, naturfare, infrastruktur) før det er komplett. */
export function themeNeedsLookups(theme: Theme): boolean {
  return theme.source.kind === "section" && sectionWaitsForLookups(theme.source.sectionId);
}

/** Gruppene som hører til et tema, satt sammen av delsvarene. */
export function clustersFor(theme: Theme, parts: readonly AreaFactsResult[], radius: number): FactCluster[] {
  if (theme.source.kind !== "section") return [];
  const { sectionId, clusterId } = theme.source;
  const group = assembleSection(parts, sectionId, radius);
  return (group?.clusters ?? []).filter((c) => (clusterId ? c.id === clusterId : true));
}

/**
 * Én rad i oversikten.
 *
 * Raden formulerer ingenting selv: teksten er gruppens oppsummering fra formuleringsregisteret,
 * eller tellingen av plansaker. Et tema uten svar står ikke i oversikten — fravær av data er ikke
 * et funn. `text === null` betyr at kilden ikke har svart ennå.
 */
export interface OverviewRow {
  theme: Theme;
  text: string | null;
  /** Avgrensninger som hører til linjen, f.eks. radius og periode. */
  detail?: string;
}

export interface OverviewInput {
  stored: AreaFactsResult | null;
  /** null mens oppslagene pågår. */
  lookups: AreaFactsResult | null;
  events: AreaEventsResult | null;
  radius: number;
}

export function buildOverview({ stored, lookups, events, radius }: OverviewInput): OverviewRow[] {
  const rows: OverviewRow[] = [];

  for (const theme of themesFor(stored)) {
    if (theme.source.kind === "friluft") continue; // Rendres på serveren; se AreaPanel.

    if (theme.source.kind === "saker") {
      if (events === null) rows.push({ theme, text: null });
      else if (events.status === "ok" && events.dataUpdatedAt !== null) {
        if (events.events.length > 0) {
          rows.push({ theme, text: eventCountLabel(events.events, radius), detail: `Siste ${DEFAULT_ANNOUNCED_WITHIN_MONTHS} måneder` });
        } else {
          const { headline, detail } = eventEmptyParts(radius);
          rows.push({ theme, text: headline, detail });
        }
      }
      continue;
    }

    const needsLookups = themeNeedsLookups(theme);
    if (stored === null || (needsLookups && lookups === null)) {
      // Temaene i Nærområdet kjenner vi først når databasen har svart.
      if (theme.source.sectionId !== NAEROMRADET && theme.primary) rows.push({ theme, text: null });
      continue;
    }
    const parts = [stored, ...(needsLookups && lookups ? [lookups] : [])];
    // Svarte ikke en kilde temaet trenger, sier vi ingenting — kildelinjen nederst forklarer.
    if (parts.some((part) => part.status !== "ok")) continue;

    const clusters = clustersFor(theme, parts, radius);
    const forste = clusters[0];
    if (!forste) continue;
    if (clusters.length === 1 && forste.emptyNote) {
      rows.push({ theme, text: forste.emptyNote.text, detail: forste.emptyNote.detail ?? undefined });
    } else if (clusters.length === 1 && forste.label !== theme.label && theme.source.clusterId === undefined) {
      // Gruppen har et eget, mer presist navn («Støy fra veitrafikk · Lden 60–64 dB»).
      rows.push({ theme, text: forste.label, detail: forste.summary || undefined });
    } else {
      const text = clusters.map((c) => c.emptyNote?.text ?? c.summary).filter(Boolean).join(" · ");
      if (text) rows.push({ theme, text });
    }
  }

  return rows;
}

/**
 * Hva kartet viser for et valgt tema.
 *
 * Uten valgt tema vises alt. Med et tema vises bare det temaet eier: stedene i temaets
 * kategorier, og planområdene bare for «Planer». Søkepunktet og radien står alltid.
 */
export interface MapFocus {
  categories: ReadonlySet<AreaCategory> | null;
  plans: boolean;
}

export function mapFocus(theme: Theme | null): MapFocus {
  if (!theme) return { categories: null, plans: true };
  return { categories: new Set(theme.categories), plans: theme.source.kind === "saker" };
}

/**
 * Om den vanlige radiusvelgeren (500 m / 1 km / 3 km) gjelder for temaet.
 *
 * Friluft har sin egen, større radius: en hytte en mil unna er i nærheten, et byggeprosjekt en
 * mil unna er det ikke. Der skjules velgeren og radiusringen, så de ikke ser ut til å styre noe
 * de ikke styrer. Valgt radius ligger fortsatt i URL-en og er tilbake når temaet forlates.
 */
export function usesSearchRadius(theme: Theme | null): boolean {
  return theme?.source.kind !== "friluft";
}

/**
 * URL-en for et valgt tema: samme adresse, med `tema` satt eller fjernet.
 *
 * Temaet ligger i URL-en, så en visning kan deles og nettleserens tilbakeknapp går til
 * oversikten. Det er en søkeparameter og ikke et anker: ingenting på siden skal rulle.
 */
export function themeHref(pathname: string, search: string, themeId: string | null): string {
  const params = new URLSearchParams(search);
  if (themeId) params.set("tema", themeId);
  else params.delete("tema");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
