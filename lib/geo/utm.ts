/**
 * ETRS89 / UTM sone 32N (EPSG:25832) → lengde- og breddegrad (WGS84).
 *
 * Oslo kommunes WFS-er leverer koordinater i UTM 32N og overser `srsName`, så
 * omregningen må gjøres her. Dette er standard invers transvers Mercator på
 * GRS80-ellipsoiden. ETRS89 og WGS84 skiller under én meter i Norge — langt under
 * presisjonen i kildedataene, som er punkter satt på en adresse.
 */

const A = 6_378_137; // GRS80 store halvakse
const F = 1 / 298.257222101; // GRS80 flattrykning
const K0 = 0.9996;
const FALSE_EASTING = 500_000;
const ZONE_32_CENTRAL_MERIDIAN = (9 * Math.PI) / 180;

const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);

/** @param coordinate `[easting, northing]` i meter. @returns `[lengdegrad, breddegrad]`. */
export function utm32ToWgs84([easting, northing]: readonly [number, number]): [number, number] {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const m = northing / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));

  // Fotpunktsbredden: breddegraden med samme meridianbuelengde som punktet.
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);

  const c1 = EP2 * cos1 ** 2;
  const t1 = tan1 ** 2;
  const n1 = A / Math.sqrt(1 - E2 * sin1 ** 2);
  const r1 = (A * (1 - E2)) / (1 - E2 * sin1 ** 2) ** 1.5;
  const d = (easting - FALSE_EASTING) / (n1 * K0);

  const lat =
    phi1 -
    ((n1 * tan1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * EP2 - 3 * c1 ** 2) * d ** 6) / 720);

  const lng =
    ZONE_32_CENTRAL_MERIDIAN +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * EP2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cos1;

  return [(lng * 180) / Math.PI, (lat * 180) / Math.PI];
}
