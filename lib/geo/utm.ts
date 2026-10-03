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
export function utm32ToWgs84(coordinate: readonly [number, number]): [number, number] {
  return utmToWgs84(coordinate, ZONE_32_CENTRAL_MERIDIAN);
}

const ZONE_33_CENTRAL_MERIDIAN = (15 * Math.PI) / 180;

/**
 * ETRS89 / UTM sone 33N (EPSG:25833) — det Kartverket bruker for landsdekkende data, også
 * utenfor sonen. Formelen er den samme; bare sentralmeridianen er en annen.
 */
export function utm33ToWgs84(coordinate: readonly [number, number]): [number, number] {
  return utmToWgs84(coordinate, ZONE_33_CENTRAL_MERIDIAN);
}

function utmToWgs84([easting, northing]: readonly [number, number], centralMeridian: number): [number, number] {
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
    centralMeridian +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * EP2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cos1;

  return [(lng * 180) / Math.PI, (lat * 180) / Math.PI];
}

/**
 * ETRS89 / UTM sone 33N (EPSG:25833) → lengde- og breddegrad, nøyaktig i hele landet.
 *
 * `utm33ToWgs84` over er en kort rekkeutvikling rundt sentralmeridianen. Den holder for data som
 * ligger i eller nær sonen, men landsdekkende filer i UTM 33 dekker fra 4° til 31° øst. Målt mot
 * DSBs 556 tilfluktsrom (2026-10-04) bommet den med over 1 m på 88 rom og med 42 m i Vardø.
 *
 * Dette er Krügers rekker i tredje flattrykning `n` (Karney 2011), til fjerde orden. De er
 * nøyaktige til under en millimeter flere tusen kilometer fra sentralmeridianen. Målt mot de
 * samme 556 rommene: største avvik fra posisjonene Geonorges WFS ga i EPSG:4326 er 6 cm — det
 * samme som PostGIS' st_transform gir, altså kildens egen avrunding og ikke omregningen.
 *
 * @param coordinate `[easting, northing]` i meter. @returns `[lengdegrad, breddegrad]`.
 */
export function utm33ToWgs84Exact([easting, northing]: readonly [number, number]): [number, number] {
  const n = F / (2 - F);
  const n2 = n * n;
  const n3 = n2 * n;
  const n4 = n3 * n;
  // Rektifiserende radius, og koeffisientene for den inverse rekken.
  const rectifying = (A / (1 + n)) * (1 + n2 / 4 + n4 / 64);
  const beta = [
    n / 2 - (2 * n2) / 3 + (37 * n3) / 96 - n4 / 360,
    n2 / 48 + n3 / 15 - (437 * n4) / 1440,
    (17 * n3) / 480 - (37 * n4) / 840,
    (4397 * n4) / 161_280,
  ];

  const xi = northing / (K0 * rectifying);
  const eta = (easting - FALSE_EASTING) / (K0 * rectifying);
  let xiPrime = xi;
  let etaPrime = eta;
  beta.forEach((b, index) => {
    const k = 2 * (index + 1);
    xiPrime -= b * Math.sin(k * xi) * Math.cosh(k * eta);
    etaPrime -= b * Math.cos(k * xi) * Math.sinh(k * eta);
  });

  // Konform breddegrad, så geodetisk breddegrad ved iterasjon (konvergerer på få runder).
  const tauPrime = Math.sin(xiPrime) / Math.hypot(Math.sinh(etaPrime), Math.cos(xiPrime));
  const e = Math.sqrt(E2);
  let tau = tauPrime;
  for (let i = 0; i < 8; i++) {
    const sigma = Math.sinh(e * Math.atanh((e * tau) / Math.hypot(1, tau)));
    const guess = tau * Math.hypot(1, sigma) - sigma * Math.hypot(1, tau);
    const delta =
      ((tauPrime - guess) / Math.hypot(1, guess)) * ((1 + (1 - E2) * tau * tau) / ((1 - E2) * Math.hypot(1, tau)));
    tau += delta;
    if (Math.abs(delta) < 1e-14) break;
  }

  const lat = Math.atan(tau);
  const lng = ZONE_33_CENTRAL_MERIDIAN + Math.atan2(Math.sinh(etaPrime), Math.cos(xiPrime));
  return [(lng * 180) / Math.PI, (lat * 180) / Math.PI];
}
