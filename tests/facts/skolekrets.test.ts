import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { velgKrets, type SkolekretsRad } from "@/lib/facts/skolekrets";
import {
  describeSkolekrets,
  SKOLEKRETS_FORBEHOLD,
  SKOLEKRETS_LABEL,
  SKOLEKRETS_UNDERTEKST,
  SKOLEKRETS_UNGDOMSTRINN,
} from "@/lib/facts/wording";
import { OsloSkolekretsProvider } from "@/lib/providers/oslo/skolekrets";
import { gmlFeatureMembers } from "@/lib/providers/gml";

/**
 * Skolekrets er det eneste faktumet vårt som handler om å ligge INNE i et område.
 * Testene her holder på tre ting: at vi aldri gjetter, at ordlyden aldri lover en
 * skoleplass, og at koordinatene havner i Oslo og ikke i Nordsjøen.
 */

const datasett = JSON.parse(readFileSync("data/skolekretser.json", "utf8")) as {
  kretser: { krets: string; skoler: { navn: string; orgnr: string | null }[] }[];
};

const rad = (title: string, contains: boolean): SkolekretsRad => ({ title, contains, source_url: null });

describe("hvilken krets punktet ligger i", () => {
  it("svarer med kretsen når nøyaktig én dekker punktet", () => {
    const r = velgKrets([rad("Nordberg", true), rad("Tåsen", false)]);
    expect(r.status).toBe("ok");
    expect(r.status === "ok" && r.krets).toBe("Nordberg");
  });

  it("sier «utenfor» når ingen krets dekker punktet — og gjetter ikke på nærmeste", () => {
    // Slik ser et punkt utenfor Oslo ut: naboer kan ligge innen radiusen, men ingen dekker.
    expect(velgKrets([]).status).toBe("utenfor");
    expect(velgKrets([rad("Tåsen", false), rad("Berg", false)]).status).toBe("utenfor");
  });

  it("velger ikke én av flere når punktet dekkes av mer enn én", () => {
    const r = velgKrets([rad("Tåsen", true), rad("Berg", true)]);
    expect(r.status).toBe("flertydig");
    expect(r.status === "flertydig" && [...r.kretser]).toEqual(["Tåsen", "Berg"]);
  });

  it("slår opp skolen fra det kuraterte datasettet, ikke fra kretsnavnet", () => {
    const r = velgKrets([rad("Majorstua", true)]);
    // Kretsen heter «Majorstua», skolen «Majorstuen skole». Vi utleder ikke det ene av det andre.
    expect(r.status === "ok" && r.skoler.map((s) => s.navn)).toEqual(["Majorstuen skole"]);
  });

  it("viser begge skolene i den delte kretsen", () => {
    const r = velgKrets([rad("Svarttjern og Tiurleiken", true)]);
    expect(r.status === "ok" && r.skoler.map((s) => s.navn)).toEqual(["Svarttjern skole", "Tiurleiken skole"]);
  });

  it("gir tom skoleliste, ikke en gjetning, for en krets vi ikke har kuratert", () => {
    const r = velgKrets([rad("En krets som ikke finnes", true)]);
    expect(r.status === "ok" && r.skoler).toEqual([]);
  });
});

describe("ordlyden", () => {
  const alle = [
    SKOLEKRETS_LABEL,
    SKOLEKRETS_UNDERTEKST,
    SKOLEKRETS_FORBEHOLD,
    SKOLEKRETS_UNGDOMSTRINN,
    describeSkolekrets(["Nordberg skole"], "Nordberg"),
    describeSkolekrets([], "Nordberg"),
    describeSkolekrets(["Svarttjern skole", "Tiurleiken skole"], "Svarttjern og Tiurleiken"),
  ].join(" ");

  it("lover aldri en skoleplass", () => {
    for (const forbudt of [/din skole/i, /sogner/i, /garantert/i, /du vil f[åa]/i, /n[æe]rmeste skole/i]) {
      expect(alle).not.toMatch(forbudt);
    }
  });

  it("sier at området er veiledende, og at kapasitet kan gi en annen skole", () => {
    expect(SKOLEKRETS_UNDERTEKST).toBe("Veiledende inntaksområde");
    expect(SKOLEKRETS_FORBEHOLD).toContain("ikke en garanti for skoleplass");
    expect(SKOLEKRETS_FORBEHOLD).toContain("Kapasitet");
  });

  it("formulerer seg om adressen, ikke om brukeren", () => {
    expect(describeSkolekrets(["Nordberg skole"], "Nordberg")).toBe(
      "Adressen ligger i det veiledende inntaksområdet til Nordberg skole.",
    );
    expect(describeSkolekrets(["Svarttjern skole", "Tiurleiken skole"], "Svarttjern og Tiurleiken")).toContain(
      "deles av Svarttjern skole og Tiurleiken skole",
    );
  });

  it("sier at ungdomstrinnet følger barneskolen, ikke en egen geografi", () => {
    expect(SKOLEKRETS_UNGDOMSTRINN).toContain("barnetrinnet");
    expect(SKOLEKRETS_UNGDOMSTRINN).toContain("nærskolerett");
  });
});

describe("normalisering fra kilden", () => {
  const provider = new OsloSkolekretsProvider();
  /** MapServer WFS 1.1: featureMember, msGeometry, posList i EPSG:32632 med øst før nord. */
  const gml = (innhold: string) =>
    `<?xml version="1.0"?><wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs"
       xmlns:gml="http://www.opengis.net/gml" xmlns:ms="http://mapserver.gis.umn.edu/mapserver">${innhold}</wfs:FeatureCollection>`;
  const krets = (navn: string, ring = "594138.98 6643513.45 594073.13 6643575.09 594020.63 6643646.59 594138.98 6643513.45") =>
    `<gml:featureMember><ms:Skolekretser_f><gml:boundedBy/><ms:msGeometry><gml:Polygon srsName="EPSG:32632"><gml:exterior><gml:LinearRing><gml:posList srsDimension="2">${ring}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></ms:msGeometry><ms:SKRETSNAVN>${navn}</ms:SKRETSNAVN></ms:Skolekretser_f></gml:featureMember>`;

  const normaliser = (xml: string) =>
    provider.normalize({ features: gmlFeatureMembers(xml, "Skolekretser_f"), documents: [] });

  it("legger polygonet i Oslo, ikke i Nordsjøen", () => {
    const { records } = normaliser(gml(krets("Bjølsen")));
    expect(records).toHaveLength(1);
    const [lng, lat] = (records[0]!.geometry as { coordinates: number[][][] }).coordinates[0]![0]!;
    // 594139 E / 6643513 N i UTM 32N. Feil akserekkefølge gir ~3,4 / 57,7 i stedet — altså
    // et punkt i Nordsjøen, som er nøyaktig feilen denne testen finnes for å fange.
    expect(lng).toBeCloseTo(10.6837, 3);
    expect(lat).toBeCloseTo(59.9183, 3);
  });

  it("beholder kretsnavnet rått som ekstern id og tittel", () => {
    const { records } = normaliser(gml(krets("Svarttjern og Tiurleiken")));
    expect(records[0]!.externalId).toBe("Svarttjern og Tiurleiken");
    expect(records[0]!.title).toBe("Svarttjern og Tiurleiken");
    expect(records[0]!.category).toBe("skolekrets");
    expect(records[0]!.subtype).toBe("inntaksomrade_barneskole");
  });

  it("datostempler ikke noe kilden ikke har datostemplet", () => {
    const { records } = normaliser(gml(krets("Berg")));
    expect(records[0]!.sourceUpdatedAt).toBeNull();
  });

  it("avviser rader uten navn eller uten geometri i stedet for å gjette", () => {
    const utenNavn = `<gml:featureMember><ms:Skolekretser_f><ms:msGeometry><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>594138.98 6643513.45 594073.13 6643575.09 594020.63 6643646.59 594138.98 6643513.45</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></ms:msGeometry></ms:Skolekretser_f></gml:featureMember>`;
    const utenGeometri = `<gml:featureMember><ms:Skolekretser_f><ms:SKRETSNAVN>Uten flate</ms:SKRETSNAVN></ms:Skolekretser_f></gml:featureMember>`;
    const { records, rejected } = normaliser(gml(utenNavn + utenGeometri));
    expect(records).toEqual([]);
    expect(rejected).toHaveLength(2);
    expect(rejected.map((r) => r.reason).join(" ")).toMatch(/SKRETSNAVN.*geometri|geometri.*SKRETSNAVN/s);
  });

  it("avviser duplikate kretsnavn, fordi navnet er vår eneste nøkkel", () => {
    const { records, rejected } = normaliser(gml(krets("Berg") + krets("Berg")));
    expect(records).toHaveLength(1);
    expect(rejected[0]!.reason).toContain("finnes fra før");
  });
});

describe("det kuraterte koblingsdatasettet", () => {
  it("dekker alle 105 kretsene", () => {
    expect(datasett.kretser).toHaveLength(105);
    expect(new Set(datasett.kretser.map((k) => k.krets)).size).toBe(105);
  });

  it("har minst én navngitt skole per krets", () => {
    for (const k of datasett.kretser) {
      expect(k.skoler.length).toBeGreaterThan(0);
      for (const s of k.skoler) expect(s.navn).toMatch(/skole$/);
    }
  });

  it("har organisasjonsnummer på ni siffer der skolen finnes hos oss", () => {
    for (const k of datasett.kretser) {
      for (const s of k.skoler) {
        if (s.orgnr !== null) expect(s.orgnr).toMatch(/^\d{9}$/);
      }
    }
  });

  it("holder de to unntakene der kretsnavnet ikke er skolenavnet", () => {
    const finn = (navn: string) => datasett.kretser.find((k) => k.krets === navn);
    expect(finn("Majorstua")?.skoler.map((s) => s.navn)).toEqual(["Majorstuen skole"]);
    expect(finn("Svarttjern og Tiurleiken")?.skoler).toHaveLength(2);
  });
});
