import type { Theme } from "@/lib/area-themes";
import type { LngLatBounds } from "@/lib/geo/bounds";

/**
 * Hvordan kartet på resultatsiden ser ut for et gitt tema.
 *
 * Prinsippet: bakgrunnskartet er bakgrunn, NaboRadars data er forgrunn — og bare ett tema om
 * gangen får farge.
 *
 * - **Oversikt** (ingen tema valgt): alle funn vises, men nøytralt. Små grå punkter og svake
 *   flater sier «her finnes noe», uten at ti temafarger konkurrerer. Søkepunktet er det
 *   tydeligste i kartet.
 * - **Valgt tema:** bare temaets egne funn vises, i temaets farge og litt større. Resten skjules:
 *   bakgrunnskartet gir den geografiske sammenhengen, og nedtonede punkter i hopetall ville
 *   fortsatt vært støy.
 * - **Valgt objekt** er alltid tydeligst: større, med hvit kant og en ring i temafargen.
 *
 * Tette punkter klynges i begge moduser.
 */
export type MapMode = "overview" | "theme";

/** Nøytral farge for funn i oversikten. Mørk nok til å synes, uten å være en temafarge. */
export const NEUTRAL_COLOR = "#69717b";

export interface MapTone {
  mode: MapMode;
  /** Fargen funnene tegnes i. */
  color: string;
}

export function mapTone(theme: Theme | null): MapTone {
  return theme ? { mode: "theme", color: theme.color } : { mode: "overview", color: NEUTRAL_COLOR };
}

/** Størrelsene i de to modusene. Valgt objekt er alltid størst. */
export const POINT_STYLE = {
  overview: { radius: 4, stroke: 1.25, opacity: 0.8 },
  theme: { radius: 6.5, stroke: 2, opacity: 0.95 },
  selected: { radius: 9, halo: 16 },
} as const;

/**
 * Klynging. Under zoom 14 slås nære punkter sammen; fra 14 vises hvert punkt for seg. Grensen
 * er den samme som for eiendomsoppslag (AreaExplorer), slik at et klikk på en klynge aldri
 * forveksles med et klikk på en tomt.
 */
export const CLUSTER = { radius: 34, maxZoom: 13 } as const;

/** Teksten på merkelappen i kartet: hva som faktisk vises akkurat nå. */
export function mapChipLabel(theme: Theme | null, visibleCount: number, loaded = true): string {
  if (!theme) return "Viser: alle temaer";
  const navn = theme.label.charAt(0).toLocaleLowerCase("nb-NO") + theme.label.slice(1);
  // Før dataene er kommet vet vi ikke om temaet har noe i kartet. Da sier vi ikke at det er tomt.
  return visibleCount > 0 || !loaded ? `Viser: ${navn}` : `${theme.label}: ingen steder å vise i kartet`;
}

/**
 * Utsnittet som rommer søkepunktet og alle punktene — for temaer der funnene ligger langt
 * utenfor radien (friluft: hytter opptil 10–20 km unna). Uten punkter: null, og kartet beholder
 * radiusutsnittet.
 */
export function boundsAround(center: [number, number], points: readonly [number, number][]): LngLatBounds | null {
  if (points.length === 0) return null;
  let [west, south] = center;
  let [east, north] = center;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}
