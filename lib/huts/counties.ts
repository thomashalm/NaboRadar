import { hutSlug } from "./href";
import { HUT_TYPES, type HutType } from "./types";

/**
 * Hytter etter fylke: fylkessidene (/hytter/fylke/<slug>) og oversikten på /hytter.
 *
 * Databasen kjenner bare kommunenummeret. Fylket kommer fra Kartverkets kommuneregister
 * (lib/geo/municipalities.ts, med øyeblikksbilde som reserve). En hytte uten kommune i kilden
 * står derfor ikke på noen fylkesside — den gjettes ikke inn i et fylke.
 *
 * Rene funksjoner, så grupperingen kan testes uten database.
 */

export interface IndexHut {
  id: string;
  name: string;
  type: HutType;
  municipalityNumber: string | null;
}

export interface MunicipalityInfo {
  name: string;
  county: string;
}

const sorter = new Intl.Collator("nb", { sensitivity: "base", numeric: true });

/** Fylkets adresse: «Trøndelag» → «trondelag», «Møre og Romsdal» → «more-og-romsdal». */
export function countySlug(county: string): string {
  return hutSlug(county);
}

export function countyHref(county: string): string {
  return `/hytter/fylke/${countySlug(county)}`;
}

/** Fylket med denne adressen, og kommunene i det. Null når slugen ikke er et fylke. */
export function findCounty(slug: string, register: ReadonlyMap<string, MunicipalityInfo>): { county: string; municipalities: string[] } | null {
  let county: string | null = null;
  const municipalities: string[] = [];
  for (const [number, info] of register) {
    if (countySlug(info.county) !== slug) continue;
    county = info.county;
    municipalities.push(number);
  }
  return county ? { county, municipalities: municipalities.sort() } : null;
}

export interface CountyCount {
  county: string;
  slug: string;
  huts: number;
}

/**
 * Antall hytter per fylke, fra antall per kommune. Sortert alfabetisk. `withoutCounty` er
 * hyttene uten kommune, eller med et kommunenummer registeret ikke kjenner.
 */
export function countyCounts(
  rows: readonly { municipalityNumber: string | null; huts: number }[],
  register: ReadonlyMap<string, MunicipalityInfo>,
): { counties: CountyCount[]; withoutCounty: number } {
  const perFylke = new Map<string, number>();
  let withoutCounty = 0;
  for (const row of rows) {
    const county = row.municipalityNumber ? register.get(row.municipalityNumber)?.county : undefined;
    if (!county) withoutCounty += row.huts;
    else perFylke.set(county, (perFylke.get(county) ?? 0) + row.huts);
  }
  const counties = [...perFylke]
    .filter(([, huts]) => huts > 0)
    .map(([county, huts]) => ({ county, slug: countySlug(county), huts }))
    .sort((a, b) => sorter.compare(a.county, b.county));
  return { counties, withoutCounty };
}

export interface CountyMunicipality {
  number: string;
  name: string;
  huts: IndexHut[];
}

export interface CountyListing {
  county: string;
  slug: string;
  total: number;
  /** Antall per type, flest først (likt antall: typenes faste rekkefølge). Bare typene som finnes i fylket. */
  types: { type: HutType; count: number }[];
  /** Kommunene med hytter, alfabetisk; hyttene alfabetisk innen kommunen. */
  municipalities: CountyMunicipality[];
}

/**
 * Hyttene i ett fylke, gruppert per kommune. Hytter fra andre fylker eller uten kommune tas
 * aldri med, selv om de skulle komme med i svaret. Dubletter (samme id) telles én gang.
 */
export function groupCountyHuts(
  county: string,
  huts: readonly IndexHut[],
  register: ReadonlyMap<string, MunicipalityInfo>,
): CountyListing {
  const sett = new Set<string>();
  const perKommune = new Map<string, IndexHut[]>();
  for (const hut of huts) {
    if (!hut.municipalityNumber || sett.has(hut.id)) continue;
    if (register.get(hut.municipalityNumber)?.county !== county) continue;
    sett.add(hut.id);
    perKommune.set(hut.municipalityNumber, [...(perKommune.get(hut.municipalityNumber) ?? []), hut]);
  }
  const municipalities = [...perKommune]
    .map(([number, list]) => ({
      number,
      name: register.get(number)!.name,
      huts: [...list].sort((a, b) => sorter.compare(a.name, b.name) || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => sorter.compare(a.name, b.name));
  const typer = new Map<HutType, number>();
  for (const m of municipalities) for (const hut of m.huts) typer.set(hut.type, (typer.get(hut.type) ?? 0) + 1);
  return {
    county,
    slug: countySlug(county),
    total: sett.size,
    types: [...typer]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || HUT_TYPES.indexOf(a.type) - HUT_TYPES.indexOf(b.type)),
    municipalities,
  };
}

/** Strukturert brødsmulesti. `url` er absolutte, kanoniske adresser. */
export function breadcrumbList(items: readonly { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}
