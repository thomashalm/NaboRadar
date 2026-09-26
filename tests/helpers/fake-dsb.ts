/**
 * Falsk DSB-WFS for tilfluktsrom.
 *
 * Etterligner det som gjør kilden vanskelig: `lokalId` er ny for hvert uttrekk, og
 * `datauttaksdato` har millisekunder som flytter seg. Bare `romnr` står stille. Det er hele
 * poenget med hjelperen — en test som gjenbruker samme lokalId ville ikke fanget feilen.
 */

export interface FakeRom {
  romnr: number;
  plasser: number;
  adresse: string;
  /** [lengdegrad, breddegrad] */
  punkt: [number, number];
}

export function fakeRom(romnr: number, over: Partial<FakeRom> = {}): FakeRom {
  return {
    romnr,
    plasser: 100 + romnr,
    adresse: `Testveien ${romnr} - Testrom`,
    punkt: [10.7 + romnr / 1000, 59.9 + romnr / 1000],
    ...over,
  };
}

/**
 * Bygger et uttrekk. `generasjon` bytter alle lokalId-er og uttakstidspunkt, slik et nytt DSB-
 * uttrekk gjør, uten å endre noe som faktisk beskriver rommet.
 */
export function dsbUttrekk(rom: FakeRom[], generasjon = 1): string {
  const uttak = new Date(Date.UTC(2026, 8, 20 + generasjon, 23, 40, 59, 100 + generasjon)).toISOString().replace("Z", "");
  const members = rom
    .map((r, i) => {
      // Ustabil, men deterministisk per generasjon — som DSBs egen lokalId.
      const lokalId = `00000000-0000-4000-8000-${String(generasjon).padStart(6, "0")}${String(r.romnr).padStart(6, "0")}`;
      return `  <member>
    <app:Tilfluktsrom gml:id="tilfluktsrom.${i + 1}">
      <app:identifikasjon>
        <app:Identifikasjon>
          <app:lokalId>${lokalId}</app:lokalId>
          <app:navnerom>https://data.geonorge.no/sosi/samfunnssikkerhet/tilfluktsrom</app:navnerom>
          <app:versjonId>20191001</app:versjonId>
        </app:Identifikasjon>
      </app:identifikasjon>
      <app:datauttaksdato>${uttak}</app:datauttaksdato>
      <app:opphav>Direktoratet for samfunnssikkerhet og beredskap</app:opphav>
      <app:posisjon>
        <gml:Point gml:id="tilfluktsrom.${i + 1}_APP_POSISJON" srsName="urn:ogc:def:crs:EPSG::4326">
          <gml:pos>${r.punkt[1]} ${r.punkt[0]}</gml:pos>
        </gml:Point>
      </app:posisjon>
      <app:romnr>${r.romnr}</app:romnr>
      <app:plasser>${r.plasser}</app:plasser>
      <app:adresse>${r.adresse}</app:adresse>
    </app:Tilfluktsrom>
  </member>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:FeatureCollection
  xmlns:wfs="http://www.opengis.net/wfs/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:app="http://skjema.geonorge.no/SOSI/produktspesifikasjon/TilfluktsromOffentlige/20191001"
  numberReturned="${rom.length}">
${members}
</wfs:FeatureCollection>`;
}

/** fetch-erstatning som svarer med ett uttrekk, og teller kallene. */
export function fakeDsbFetch(rom: FakeRom[], generasjon = 1) {
  const kall: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    kall.push(url);
    // Andre side skal være tom, ellers paginerer wfsPages i evig løkke.
    const startIndex = Number(new URL(url).searchParams.get("startIndex") ?? "0");
    const body = dsbUttrekk(startIndex === 0 ? rom : [], generasjon);
    return new Response(body, { status: 200, headers: { "content-type": "application/xml" } });
  };
  return { fetchImpl, kall };
}
