import { describe, expect, it } from "vitest";
import {
  KATEGORIGRUPPER,
  VERIFISERING_STANDARD,
  erStandard,
  gruppeFor,
  kartHref,
  lesFilter,
  skrivFilter,
} from "@/lib/admin/research-map-filters";

/**
 * Filtrene bak research-kartet.
 *
 * URL-en er tilstanden: et utsnitt skal kunne bokmerkes, deles og navigeres fram og tilbake i.
 * Da må lesing og skriving være hverandres motsatte, og en ødelagt URL må gi et brukbart kart
 * framfor et tomt.
 */
describe("kartfilter fra URL", () => {
  it("har fornuftige standardvalg uten parametre", () => {
    const f = lesFilter({});
    expect(f.kategori).toBeUndefined();
    expect(f.confidence).toEqual(["low", "medium", "high"]);
    expect(f.sortering).toBe("interesse");
    // Kartet er hovedflaten, så funn uten koordinat er av som standard.
    expect(f.kunMedPunkt).toBe(true);
    // Avviste og arkiverte funn er konkludert research og skal ikke fylle kartet.
    expect(f.verifisering).not.toContain("rejected");
    expect(f.verifisering).not.toContain("archived");
    expect(f.verifisering).toEqual(VERIFISERING_STANDARD);
    expect(erStandard(f)).toBe(true);
  });

  it("leser kategori, status og sikkerhet", () => {
    const f = lesFilter({ kategori: "datasenter", drift: "planned", confidence: "high" });
    expect(f.kategori).toBe("datasenter");
    expect(f.drift).toEqual(["planned"]);
    expect(f.confidence).toEqual(["high"]);
  });

  it("lar avviste funn slås på eksplisitt", () => {
    expect(lesFilter({ verifisering: "rejected" }).verifisering).toEqual(["rejected"]);
  });

  it("faller tilbake til alle ved ugyldig eller tom verdi", () => {
    // En ødelagt URL skal gi et brukbart kart, ikke et tomt.
    expect(lesFilter({ confidence: "" }).confidence).toEqual(["low", "medium", "high"]);
    expect(lesFilter({ confidence: "tull" }).confidence).toEqual(["low", "medium", "high"]);
    expect(lesFilter({ kategori: "finnesikke" }).kategori).toBeUndefined();
    expect(lesFilter({ sortering: "avstand" }).sortering).toBe("interesse");
  });

  it("skriver bare det som avviker fra standard", () => {
    expect(skrivFilter(lesFilter({})).toString()).toBe("");
    expect(kartHref(lesFilter({}))).toBe("/admin/kart");
    const url = kartHref(lesFilter({ kategori: "datasenter", drift: "planned" }));
    expect(url).toContain("kategori=datasenter");
    expect(url).toContain("drift=planned");
    expect(url).not.toContain("confidence=");
  });

  it("er sin egen motsatte: skriv og les gir samme filter", () => {
    for (const params of [
      { kategori: "forsvar", drift: "active" },
      { kategori: "datasenter", confidence: "high", interesse: "high" },
      { kommune: "Tysvær", kandidat: "ja", punkt: "alle" },
      { sok: "Tofte", sortering: "kommune" },
      { verifisering: "rejected,archived" },
    ]) {
      const først = lesFilter(params);
      const igjen = lesFilter(Object.fromEntries(skrivFilter(først)));
      expect(igjen).toEqual(først);
    }
  });
});

describe("kategorimapping", () => {
  it("oversetter datasenter til intern kategori og undertype", () => {
    const g = gruppeFor("datasenter")!;
    expect(g.kategorier).toEqual(["Datasenter / industri / tekniske anlegg"]);
    expect(g.subkategorier).toEqual(["Datasenter"]);
  });

  it("skiller industri, avfall og pukk fra datasenter i samme interne kategori", () => {
    // Alle fire deler «Datasenter / industri / tekniske anlegg», og må skilles på undertype.
    for (const slug of ["industri", "avfall", "pukk"]) {
      const g = gruppeFor(slug)!;
      expect(g.kategorier).toContain("Datasenter / industri / tekniske anlegg");
      expect(g.subkategorier).toBeDefined();
      expect(g.subkategorier).not.toContain("Datasenter");
    }
  });

  it("har unike slugger og ingen tomme grupper", () => {
    const slugger = KATEGORIGRUPPER.map((g) => g.slug);
    expect(new Set(slugger).size).toBe(slugger.length);
    for (const g of KATEGORIGRUPPER) {
      expect(g.kategorier.length).toBeGreaterThan(0);
      expect(g.label.length).toBeGreaterThan(0);
    }
  });
});
