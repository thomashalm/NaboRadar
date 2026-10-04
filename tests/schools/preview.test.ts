import { describe, expect, it } from "vitest";
import { describeSkole } from "@/lib/facts/wording";
import { orderSchoolsForPreview, schoolKind, type SchoolKind } from "@/lib/schools/preview";

/**
 * De tre første skolene i listen på /omrade. Radene er sortert nærmest først, som i databasen.
 */
type Rad = { navn: string; kind: SchoolKind };
const rad = (navn: string, kind: SchoolKind): Rad => ({ navn, kind });
const topp3 = (rader: Rad[]) => orderSchoolsForPreview(rader, (r) => r.kind).slice(0, 3).map((r) => r.navn);
const alle = (rader: Rad[]) => orderSchoolsForPreview(rader, (r) => r.kind).map((r) => r.navn);

describe("skoletype fra trinn", () => {
  const kind = (subtype: string, fra: unknown, til: unknown) => schoolKind({ subtype, lavesteTrinn: fra, hoyesteTrinn: til });

  it("leser type av trinnene", () => {
    expect(kind("grunnskole", 1, 7)).toBe("barneskole");
    expect(kind("grunnskole", 1, 4)).toBe("barneskole");
    expect(kind("grunnskole", 8, 10)).toBe("ungdomsskole");
    expect(kind("grunnskole", 1, 10)).toBe("barne_og_ungdomsskole");
    expect(kind("grunnskole", 5, 10)).toBe("barne_og_ungdomsskole");
    expect(kind("videregaende_skole", 11, 13)).toBe("videregaende");
  });

  it("gjetter ikke når trinn mangler", () => {
    expect(kind("grunnskole", null, null)).toBe("skole");
    expect(kind("grunnskole", undefined, 7)).toBe("skole");
  });

  it("merker skolen kort i listen", () => {
    expect(describeSkole("grunnskole", { lavesteTrinn: 1, hoyesteTrinn: 7 })).toBe("Barneskole, 1.–7. trinn");
    expect(describeSkole("grunnskole", { lavesteTrinn: 8, hoyesteTrinn: 10 })).toBe("Ungdomsskole, 8.–10. trinn");
    expect(describeSkole("grunnskole", { lavesteTrinn: 1, hoyesteTrinn: 10 })).toBe("Barne- og ungdomsskole, 1.–10. trinn");
    expect(describeSkole("grunnskole", {})).toBe("Skole");
    expect(describeSkole("videregaende_skole", { lavesteTrinn: 11, hoyesteTrinn: 13 })).toBe("Videregående skole, Vg1–Vg3");
  });
});

describe("de tre første skolene", () => {
  it("Karl Johans gate 1: videregående skyver ikke ut grunnskolen", () => {
    expect(
      topp3([rad("Otto Treider", "videregaende"), rad("Urtehagen vgs", "videregaende"), rad("Møllergata vgs", "videregaende"), rad("St Sunniva", "barne_og_ungdomsskole"), rad("Edvard Munch vgs", "videregaende")]),
    ).toEqual(["St Sunniva", "Otto Treider", "Urtehagen vgs"]);
  });

  it("barneskole først, så ungdomsskole, så nærmeste øvrige", () => {
    expect(topp3([rad("Vgs nær", "videregaende"), rad("Ungdom", "ungdomsskole"), rad("Barne", "barneskole"), rad("Barne 2", "barneskole")])).toEqual(["Barne", "Ungdom", "Vgs nær"]);
  });

  it("en 1.–10.-skole dekker begge behov og står én gang", () => {
    const resultat = topp3([rad("Kombinert", "barne_og_ungdomsskole"), rad("Barne", "barneskole"), rad("Ungdom", "ungdomsskole"), rad("Vgs", "videregaende")]);
    expect(resultat).toEqual(["Kombinert", "Barne", "Ungdom"]);
    expect(new Set(resultat).size).toBe(3);
  });

  it("barneskole nærmest og kombinert skole lenger unna: begge vises, kombinert som ungdomstilbudet", () => {
    expect(topp3([rad("Barne", "barneskole"), rad("Vgs", "videregaende"), rad("Kombinert", "barne_og_ungdomsskole"), rad("Ungdom", "ungdomsskole")])).toEqual(["Barne", "Kombinert", "Vgs"]);
  });

  it("mangler ungdomsskole innen radius: plassen står ikke tom", () => {
    expect(topp3([rad("Vgs 1", "videregaende"), rad("Barne", "barneskole"), rad("Vgs 2", "videregaende")])).toEqual(["Barne", "Vgs 1", "Vgs 2"]);
  });

  it("bare videregående innen radius: de vises på avstand", () => {
    expect(topp3([rad("Vgs 1", "videregaende"), rad("Vgs 2", "videregaende")])).toEqual(["Vgs 1", "Vgs 2"]);
  });

  it("få skoler: ingen gjentas og ingen forsvinner", () => {
    expect(alle([rad("Barne", "barneskole")])).toEqual(["Barne"]);
    expect(alle([])).toEqual([]);
  });

  describe("grunnskole uten registrerte trinn", () => {
    it("en nærskole uten trinn får plass når den ligger nærmere enn barne- og ungdomsskolen", () => {
      expect(topp3([rad("Uten trinn", "skole"), rad("Vgs", "videregaende"), rad("Barne", "barneskole"), rad("Ungdom", "ungdomsskole")])).toEqual(["Barne", "Ungdom", "Uten trinn"]);
    });

    it("den erstatter ikke barneskolen — vi vet ikke hva slags skole den er", () => {
      expect(topp3([rad("Uten trinn", "skole"), rad("Barne", "barneskole")])).toEqual(["Barne", "Uten trinn"]);
    });

    it("ligger den lenger unna enn begge, konkurrerer den på avstand med resten", () => {
      expect(topp3([rad("Barne", "barneskole"), rad("Ungdom", "ungdomsskole"), rad("Vgs", "videregaende"), rad("Uten trinn", "skole")])).toEqual(["Barne", "Ungdom", "Vgs"]);
    });

    it("finnes verken barne- eller ungdomsskole, står den først", () => {
      expect(topp3([rad("Vgs", "videregaende"), rad("Uten trinn", "skole")])).toEqual(["Uten trinn", "Vgs"]);
    });
  });

  it("resten av listen står på avstand, og ingen rader legges til eller fjernes", () => {
    const rader = [rad("Vgs 1", "videregaende"), rad("Vgs 2", "videregaende"), rad("Barne", "barneskole"), rad("Vgs 3", "videregaende"), rad("Ungdom", "ungdomsskole"), rad("Vgs 4", "videregaende"), rad("Barne 2", "barneskole")];
    expect(alle(rader)).toEqual(["Barne", "Ungdom", "Vgs 1", "Vgs 2", "Vgs 3", "Vgs 4", "Barne 2"]);
    expect(alle(rader).sort()).toEqual(rader.map((r) => r.navn).sort());
  });

  it("er deterministisk", () => {
    const rader = [rad("A", "videregaende"), rad("B", "barne_og_ungdomsskole"), rad("C", "skole"), rad("D", "barneskole")];
    expect(alle(rader)).toEqual(alle(rader));
  });
});
