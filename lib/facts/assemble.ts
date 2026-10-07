import { grunnforholdCluster, infrastrukturCluster, stoyCluster } from "@/lib/facts/clusters";
import type { AreaFactGroup, AreaFactsResult, FactCluster } from "@/lib/facts/queries";
import type { AreaFact } from "@/types/area-feature";

/** Seksjoner hvis gruppe bygges av de ferdige faktaene, ikke av delsvarene hver for seg. */
const BYGGES_AV_FAKTA: Record<string, (facts: AreaFact[], radiusM: number) => FactCluster | null> = {
  grunnforhold: grunnforholdCluster,
  infrastruktur: infrastrukturCluster,
  stoy: stoyCluster,
};

function byggGruppe(sectionId: string, group: AreaFactGroup, radiusM: number): AreaFactGroup {
  const bygg = BYGGES_AV_FAKTA[sectionId];
  if (!bygg || group.facts.length === 0) return group;
  const cluster = bygg(group.facts, radiusM);
  return cluster ? { ...group, facts: [], clusters: [...group.clusters, cluster] } : group;
}

/**
 * Én seksjon, satt sammen av delsvarene som har den.
 *
 * Grunnforhold, infrastruktur og støy får kilder fra begge hold, så gruppen bygges her — når
 * delene er slått sammen. Ellers ville seksjonen fått én gruppe per kilde. Brukes både av
 * seksjonen selv og av oppsummeringen øverst, så de to alltid sier det samme.
 */
export function assembleSection(
  parts: readonly AreaFactsResult[],
  sectionId: string,
  radiusM: number,
): AreaFactGroup | null {
  const group = parts
    .flatMap((part) => (part.status === "ok" ? part.groups : []))
    .filter((g) => g.sectionId === sectionId)
    .reduce<AreaFactGroup | null>(
      (samlet, del) =>
        samlet === null
          ? del
          : {
              ...samlet,
              facts: [...samlet.facts, ...del.facts].sort(
                (a, b) => Number(b.contains) - Number(a.contains) || (a.distanceM ?? 0) - (b.distanceM ?? 0),
              ),
              clusters: [...samlet.clusters, ...del.clusters],
              overview: samlet.overview ?? del.overview,
            },
      null,
    );
  return group ? byggGruppe(sectionId, group, radiusM) : null;
}
