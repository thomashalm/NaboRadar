import { CATEGORY_SHORT, type Level, type NearbyResearch } from "./research-types";

/**
 * Rekkefølgen research vises i, i admin-adressesøket.
 *
 * Interesse først, så sikkerhet, så avstand. Et høyinteressant funn 2 km unna skal komme før et
 * middels interessant i nabogården: i admin er poenget hva som er verdt å vite om området, ikke
 * hva som tilfeldigvis er nærmest. Avstanden avgjør bare mellom funn som ellers er like.
 *
 * Rene funksjoner, uten kart og uten database, slik at rekkefølgen kan testes for seg.
 */

const RANG: Record<Level, number> = { high: 0, medium: 1, low: 2 };

export function sorterFunn(funn: readonly NearbyResearch[]): NearbyResearch[] {
  return [...funn].sort(
    (a, b) =>
      RANG[a.interest_level] - RANG[b.interest_level] ||
      RANG[a.confidence] - RANG[b.confidence] ||
      a.distance_m - b.distance_m,
  );
}

export interface Kategorigruppe {
  kategori: string;
  kortNavn: string;
  funn: NearbyResearch[];
}

/**
 * Funnene gruppert per kategori, der gruppen med det mest interessante funnet kommer først.
 * Tomme grupper finnes ikke — en kategori uten treff er ikke informasjon her.
 */
export function grupperFunn(funn: readonly NearbyResearch[]): Kategorigruppe[] {
  const grupper = new Map<string, NearbyResearch[]>();
  for (const f of sorterFunn(funn)) {
    const liste = grupper.get(f.category);
    if (liste) liste.push(f);
    else grupper.set(f.category, [f]);
  }
  // Rekkefølgen på gruppene følger deres beste funn, som allerede ligger først i hver liste.
  return [...grupper]
    .map(([kategori, iGruppen]) => ({
      kategori,
      kortNavn: CATEGORY_SHORT[kategori] ?? kategori,
      funn: iGruppen,
    }))
    .sort(
      (a, b) =>
        RANG[a.funn[0]!.interest_level] - RANG[b.funn[0]!.interest_level] ||
        RANG[a.funn[0]!.confidence] - RANG[b.funn[0]!.confidence] ||
        a.funn[0]!.distance_m - b.funn[0]!.distance_m,
    );
}

/**
 * Funn som handler om datakvalitet, lisenser og kildeproblemer hører hjemme i
 * research-oversikten, ikke i adressevisningen. Der skal det stå faktiske steder og prosjekter.
 */
const DRIFTSKATEGORIER = new Set(["Datakvalitetsavvik", "Kilder"]);

export function erStedsfunn(f: NearbyResearch): boolean {
  return f.item_type !== "data_issue" && !DRIFTSKATEGORIER.has(f.category);
}
