import { zip, zipTjener } from "./fake-zip";

/**
 * Falsk nedlastingsfil for DSBs tilfluktsrom: et zip-arkiv med én GML-fil i UTM 33, slik
 * Geonorge leverer den.
 *
 * Etterligner det som gjør kilden vanskelig: `lokalId` er ny for hvert uttrekk, og
 * `datauttaksdato` har millisekunder som flytter seg. Bare `romnr` står stille. Det er hele
 * poenget med hjelperen — en test som gjenbruker samme lokalId ville ikke fanget feilen.
 */

export interface FakeRom {
  romnr: number;
  plasser: number;
  adresse: string;
  /** [øst, nord] i EUREF89 UTM sone 33, som i fila. */
  punkt: [number, number];
}

export function fakeRom(romnr: number, over: Partial<FakeRom> = {}): FakeRom {
  return {
    romnr,
    plasser: 100 + romnr,
    adresse: `Testveien ${romnr} - Testrom`,
    // Rundt Oslo sentrum, ett rom per ti meter.
    punkt: [262_000 + romnr * 10, 6_649_000 + romnr * 10],
    ...over,
  };
}

/**
 * Bygger et uttrekk. `generasjon` bytter alle lokalId-er og uttakstidspunkt, slik et nytt DSB-
 * uttrekk gjør, uten å endre noe som faktisk beskriver rommet.
 */
export function dsbUttrekk(rom: FakeRom[], generasjon = 1): string {
  const uttak = new Date(Date.UTC(2026, 8, 20 + generasjon, 23, 40, 59)).toISOString().slice(0, 19);
  const members = rom
    .map((r) => {
      // Ustabil, men deterministisk per generasjon — som DSBs egen lokalId.
      const lokalId = `00000000-0000-4000-8000-${String(generasjon).padStart(6, "0")}${String(r.romnr).padStart(6, "0")}`;
      return `  <gml:featureMember>
    <app:Tilfluktsrom gml:id="id${lokalId}">
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
        <gml:Point gml:id="id${lokalId}-0" srsName="urn:ogc:def:crs:EPSG::25833" srsDimension="2">
          <gml:pos>${r.punkt[0]} ${r.punkt[1]}</gml:pos>
        </gml:Point>
      </app:posisjon>
      <app:romnr>${r.romnr}</app:romnr>
      <app:plasser>${r.plasser}</app:plasser>
      <app:adresse>${r.adresse}</app:adresse>
    </app:Tilfluktsrom>
  </gml:featureMember>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:app="http://skjema.geonorge.no/SOSI/produktspesifikasjon/TilfluktsromOffentlige/20191001">
${members}
</gml:FeatureCollection>`;
}

/** Arkivet slik det ligger på nedlastingstjeneren. */
export const dsbArkiv = (gml: string): Buffer =>
  zip([{ name: "Samfunnssikkerhet_0000_Norge_25833_TilfluktsromOffentlige_GML.gml", text: gml }]);

/**
 * fetch-erstatning som svarer med ett uttrekk. `endre` lar en test ødelegge fila før den pakkes —
 * fjerne et felt, tømme den, bytte koordinatsystem.
 */
export function fakeDsbFetch(rom: FakeRom[], generasjon = 1, endre: (gml: string) => string = (gml) => gml) {
  return zipTjener(dsbArkiv(endre(dsbUttrekk(rom, generasjon))));
}
