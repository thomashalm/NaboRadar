import type { AreaFactGroup, AreaFactsResult } from "./queries";

/**
 * Slår sammen delsvarene fra databasen og de direkte oppslagene til ett resultat.
 *
 * Seksjonene er de samme; kildene bidrar med ulike deler av dem. Grunnforhold får
 * kvikkleiresonene fra databasen og aktsomhetsområdet fra oppslag, Infrastruktur får
 * nettanleggene fra databasen og distribusjonsnettet fra oppslag. Rekkefølgen kommer fra
 * delsvaret som kjenner den: det er databasen som vet om søkepunktet ligger i en lokalitet
 * med forurenset grunn.
 */
export function mergeFactResults(db: AreaFactsResult, lookups: AreaFactsResult): AreaFactsResult {
  if (db.status !== "ok") return lookups;
  if (lookups.status !== "ok") return db;

  const rekkefolge = db.order.length > 0 ? db.order : lookups.order;
  const perSeksjon = new Map<string, AreaFactGroup[]>();
  for (const group of [...db.groups, ...lookups.groups]) {
    perSeksjon.set(group.sectionId, [...(perSeksjon.get(group.sectionId) ?? []), group]);
  }

  const groups = rekkefolge.flatMap((sectionId) => {
    const deler = perSeksjon.get(sectionId) ?? [];
    if (deler.length === 0) return [];
    return [
      {
        ...deler[0]!,
        facts: deler
          .flatMap((del) => del.facts)
          .sort((a, b) => Number(b.contains) - Number(a.contains) || (a.distanceM ?? 0) - (b.distanceM ?? 0)),
        clusters: deler.flatMap((del) => del.clusters),
        overview: deler.find((del) => del.overview)?.overview ?? null,
      },
    ];
  });

  return {
    status: "ok",
    groups,
    order: rekkefolge,
    mapFeatures: [...db.mapFeatures, ...lookups.mapFeatures],
    sources: [...new Map([...db.sources, ...lookups.sources].map((kilde) => [kilde.name, kilde])).values()],
    unavailableSources: [...new Set([...db.unavailableSources, ...lookups.unavailableSources])],
  };
}

