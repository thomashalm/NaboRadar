import { describe, expect, it } from "vitest";
import { describeFact, describeMapLines, describeOppvekstCluster, OPPVEKST_TYPE_LABEL } from "@/lib/facts/wording";
import { UdirBarnehagerProvider } from "@/lib/providers/udir/barnehager";
import { UdirSkolerProvider } from "@/lib/providers/udir/skoler";
import type { AreaAttributes } from "@/types/area-feature";

/** Skoler og barnehager i «Nærområdet» — nøytralt, og uten steder som er private hjem. */

const ALARMISTISK = /risiko|farlig|uønsket|problem|oppmerksom|advarsel|bekymr/i;

const skoleFeature = (over: Record<string, unknown> = {}) => ({
  type: "grunnskole" as const,
  erSpesialskole: false,
  feature: {
    organisasjonsnummer: "975279154",
    skolenavn: "Aa skole",
    iDrift: "true",
    eierforhold: "Offentlig",
    antallElever: "40",
    antallAnsatte: "18",
    oppdateringsdato: "2026-07-15T01:19:13.470",
    posisjon: { Point: { pos: "63.399160 9.502630" } },
    trinn: { Trinn: { lavesteTrinn: "1", høyesteTrinn: "10" } },
    besøksadresse: { Besøksadresse: { adressenavn: "Aunliveien 15", postnummer: "7257", poststed: "SNILLFJORD" } },
    postadresse: { Postadresse: { adressenavn: "Allfarveien 5", postnummer: "7300", poststed: "ORKANGER" } },
    ...over,
  },
});

const barnehageFeature = (over: Record<string, unknown> = {}) => ({
  organisasjonsnummer: "999297404",
  barnehagenavn: "Lykketrollet barnehage",
  barnehagetype: "OrdinærBarnehage",
  iDrift: "true",
  eierforhold: "Privat",
  antallBarn: "42",
  aldersgruppe: { Aldersgruppe: { lavesteAlder: "1", høyesteAlder: "5" } },
  kommunenavn: "Oslo",
  posisjon: { Point: { pos: "59.92992 10.71488" } },
  ...over,
});

describe("UdirSkolerProvider", () => {
  const provider = new UdirSkolerProvider();

  it("leser besøksadressen, ikke postadressen", () => {
    const { records } = provider.normalize({ features: [skoleFeature()], documents: [] });
    expect(records[0]!.attributes.adresse).toBe("Aunliveien 15");
    expect(records[0]!.attributes.poststed).toBe("SNILLFJORD");
    expect(JSON.stringify(records[0])).not.toContain("Allfarveien");
  });

  it("mapper navn, posisjon, trinn og kilde", () => {
    const { records } = provider.normalize({ features: [skoleFeature()], documents: [] });
    expect(records[0]).toMatchObject({
      externalId: "975279154",
      category: "oppvekst",
      subtype: "grunnskole",
      title: "Aa skole",
      geometry: { type: "Point", coordinates: [9.50263, 63.39916] },
      sourceUrl: "https://nsr.udir.no/enhet/975279154",
      attributes: { lavesteTrinn: 1, hoyesteTrinn: 10, antallElever: 40, eierforhold: "Offentlig" },
    });
  });

  it("utelater spesialskoler og nedlagte skoler — som utelatt, ikke som datafeil", () => {
    const { records, rejected, skipped } = provider.normalize({
      features: [
        { ...skoleFeature(), erSpesialskole: true },
        skoleFeature({ iDrift: "false", organisasjonsnummer: "111111111" }),
      ],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(rejected).toEqual([]);
    expect(skipped!.map((s) => s.reason)).toEqual(["spesialskole — vises ikke", "ikke i drift"]);
  });

  it("avviser features uten posisjon som datafeil", () => {
    const { records, rejected } = provider.normalize({
      features: [{ ...skoleFeature(), feature: { ...skoleFeature().feature, posisjon: undefined } }],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(rejected[0]!.reason).toContain("posisjon");
  });
});

describe("UdirBarnehagerProvider", () => {
  const provider = new UdirBarnehagerProvider();

  it("tar med ordinære barnehager", () => {
    const { records } = provider.normalize({ features: [barnehageFeature()], documents: [] });
    expect(records[0]).toMatchObject({
      externalId: "999297404",
      category: "oppvekst",
      subtype: "barnehage",
      title: "Lykketrollet barnehage",
      sourceUrl: "https://www.barnehagefakta.no/barnehage/999297404",
      attributes: { antallBarn: 42, lavesteAlder: 1, hoyesteAlder: 5, eierforhold: "Privat" },
    });
  });

  it("utelater familiebarnehager — de drives i private hjem", () => {
    const { records, skipped } = provider.normalize({
      features: [
        barnehageFeature({ barnehagetype: "Familiebarnehage" }),
        barnehageFeature({ barnehagetype: "ÅpenBarnehage", organisasjonsnummer: "222222222" }),
        barnehageFeature({ barnehagetype: undefined, organisasjonsnummer: "333333333" }),
      ],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(skipped!.map((s) => s.reason)).toEqual([
      "ikke ordinær barnehage (Familiebarnehage)",
      "ikke ordinær barnehage (ÅpenBarnehage)",
      "ikke ordinær barnehage (type mangler)",
    ]);
  });
});

describe("kort og popup", () => {
  const skole = (a: AreaAttributes, subtype = "grunnskole", title = "Bogstad skole") =>
    describeFact({ subtype, title, attributes: a, contains: false, externalId: null })!;

  it("viser type, trinn, elevtall og adresse", () => {
    const text = skole({ lavesteTrinn: 1, hoyesteTrinn: 7, antallElever: 392, eierforhold: "Offentlig", adresse: "Ankerveien 130", poststed: "OSLO" });
    expect(text.headline).toBe("Bogstad skole");
    expect(text.details).toEqual(["Grunnskole, 1.–7. trinn.", "392 elever · offentlig skole", "Ankerveien 130, OSLO"]);
  });

  it("håndterer manglende felt uten tomme linjer", () => {
    const text = skole({});
    expect(text.details).toEqual(["Grunnskole."]);
    expect(text.details.every((d) => d.trim().length > 0)).toBe(true);
  });

  it("beskriver barnehager med aldersgruppe", () => {
    const text = describeFact({
      subtype: "barnehage",
      title: "Lykketrollet barnehage",
      attributes: { lavesteAlder: 1, hoyesteAlder: 5, antallBarn: 42, eierforhold: "Privat" },
      contains: false,
    })!;
    expect(text.details).toEqual(["Barnehage, 1–5 år.", "42 barn · privat barnehage"]);
  });

  it("bruker nøytralt språk overalt", () => {
    const tekster = [
      skole({ antallElever: 392 }),
      skole({ antallElever: 500 }, "videregaende_skole", "Oslo katedralskole"),
      describeFact({ subtype: "barnehage", title: "X", attributes: {}, contains: false })!,
    ];
    for (const t of tekster) {
      expect([t.headline, ...t.details, t.caveat ?? ""].join(" ")).not.toMatch(ALARMISTISK);
    }
    expect(Object.values(OPPVEKST_TYPE_LABEL).join(" ")).not.toMatch(ALARMISTISK);
    const s = describeOppvekstCluster({ skoler: 2, barnehager: 7, radiusLabel: "1 km" });
    expect(s.summary).toBe("2 skoler · 7 barnehager innen 1 km");
    expect(s.caveat).toContain("Familiebarnehager i private hjem og spesialskoler er ikke med");
  });

  it("gir popup-tekst fra samme register", () => {
    expect(describeMapLines({ subtype: "grunnskole", attributes: { eierforhold: "Offentlig" } })).toEqual([
      "Grunnskole (Utdanningsdirektoratet)",
      "Offentlig eierforhold",
    ]);
    expect(describeMapLines({ subtype: "barnehage", attributes: {} })).toEqual(["Barnehage (Utdanningsdirektoratet)"]);
  });
});
