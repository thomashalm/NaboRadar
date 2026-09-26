import { describe, expect, it } from "vitest";
import {
  KATEGORIGRUPPER,
  antallAvanserte,
  avanserteChips,
  harUndertyper,
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

/**
 * Chipsene som viser hva som er valgt.
 *
 * De avanserte filtrene ligger bak «Filtre», og det man ikke ser må man kunne se at man har
 * satt — ellers blir treffene uforklarlige. Søk, kategori og kommune er ikke med, fordi de
 * står synlig i hvert sitt felt.
 */
describe("aktive filterchips", () => {
  it("er tomme når ingenting avansert er valgt", () => {
    expect(avanserteChips(lesFilter({}))).toEqual([]);
    expect(antallAvanserte(lesFilter({}))).toBe(0);
    // Kategori og kommune står i egne felt og skal ikke dupliseres som chips.
    expect(avanserteChips(lesFilter({ kategori: "datasenter", kommune: "Oslo", sok: "Tofte" }))).toEqual([]);
  });

  it("viser status, sikkerhet og interesse", () => {
    const chips = avanserteChips(lesFilter({ drift: "planned", confidence: "high" }));
    expect(chips.map((c) => c.id).sort()).toEqual(["confidence", "drift"]);
    expect(chips.find((c) => c.id === "drift")!.label).toBe("Planlagt");
    expect(antallAvanserte(lesFilter({ drift: "planned", confidence: "high" }))).toBe(2);
  });

  it("gir hver chip endringen som fjerner nettopp den", () => {
    const filter = lesFilter({ drift: "planned", confidence: "high" });
    const chip = avanserteChips(filter).find((c) => c.id === "drift")!;
    const etter = { ...filter, ...chip.fjern };
    expect(avanserteChips(etter).map((c) => c.id)).toEqual(["confidence"]);
  });

  it("viser at avviste funn er slått på", () => {
    const chips = avanserteChips(lesFilter({ verifisering: "rejected" }));
    expect(chips.map((c) => c.id)).toContain("verifisering");
    // Og ikke når standardvalget er uendret.
    expect(avanserteChips(lesFilter({})).map((c) => c.id)).not.toContain("verifisering");
  });

  it("teller sortering og kartpunkt som avanserte valg", () => {
    expect(antallAvanserte(lesFilter({ sortering: "kommune" }))).toBe(1);
    expect(antallAvanserte(lesFilter({ punkt: "alle" }))).toBe(1);
  });
});

describe("undertype vises bare når den betyr noe", () => {
  it("er skjult uten kategori", () => {
    expect(harUndertyper(undefined)).toBe(false);
  });

  it("er skjult for kategorier uten undertyper", () => {
    // Forsvar har ingen undertype-avgrensning i mappingen.
    expect(harUndertyper("forsvar")).toBe(false);
    expect(harUndertyper("va")).toBe(false);
  });

  it("er synlig for kategorier som deler seg i undertyper", () => {
    expect(harUndertyper("datasenter")).toBe(true);
    expect(harUndertyper("industri")).toBe(true);
  });
});

/**
 * Regresjon: kategorigruppene må dekke det som faktisk ligger i basen.
 *
 * Feilen dette fanger er stille: en research-runde innfører en ny underkategori
 * («Metallindustri», «Gruve», «Avløp og VA»), funnene havner i databasen, og kartet viser dem
 * aldri fordi ingen gruppe spør etter dem. Kilden er de kuraterte funnene, som er det seeden
 * legger inn.
 */
describe("gruppene dekker de kuraterte funnene", () => {
  const dekket = (kategori: string, subkategori?: string) =>
    KATEGORIGRUPPER.some(
      (g) =>
        g.kategorier.includes(kategori) &&
        (!g.subkategorier || (subkategori !== undefined && g.subkategorier.includes(subkategori))),
    );

  it("har en gruppe for hver kategori og underkategori i funnene", async () => {
    const { FUNN } = await import("../../scripts/research/funn");
    const udekket = [
      ...new Set(
        FUNN.filter((f) => !dekket(f.category, f.subcategory)).map((f) =>
          f.subcategory ? `${f.category} / ${f.subcategory}` : f.category,
        ),
      ),
    ];
    expect(udekket).toEqual([]);
  });

  it("bruker ett navn per underkategori, ikke synonymer", async () => {
    const { FUNN } = await import("../../scripts/research/funn");
    const sub = new Set(FUNN.map((f) => f.subcategory).filter((s): s is string => Boolean(s)));
    const avfall = [...sub].filter((s) => s.toLowerCase().includes("avfall"));
    expect(avfall).toEqual(["Avfall"]);
  });

  /**
   * Vokabularet for VA og mineraluttak, slik håndboken fastsetter det. Uten dette sniker synonymer
   * seg inn — «Avløp og VA» ved siden av «Renseanlegg», «Knuseverk» ved siden av «Pukkverk» — og
   * kartet blir fragmentert uten at noen ser det.
   */
  it("holder seg til det faste vokabularet for VA og mineraluttak", async () => {
    const { FUNN } = await import("../../scripts/research/funn");
    const sub = new Set(FUNN.map((f) => f.subcategory).filter((s): s is string => Boolean(s)));
    const tillatt = {
      va: ["Renseanlegg", "Vannbehandlingsanlegg", "Pumpestasjon", "VA-tunnel/fjellanlegg"],
      mineral: ["Gruve", "Pukkverk", "Steinbrudd", "Masseuttak"],
    };
    const treffer = (s: string, ord: string[]) =>
      ord.some((o) => s.toLowerCase().includes(o.toLowerCase()));
    const vaLignende = [...sub].filter((s) =>
      treffer(s, ["avløp", "renseanlegg", "vannbehandling", "pumpestasjon", "VA-"]),
    );
    const mineralLignende = [...sub].filter((s) =>
      treffer(s, ["gruve", "pukk", "steinbrudd", "masseuttak", "knuseverk", "grustak"]),
    );
    expect(vaLignende.filter((s) => !tillatt.va.includes(s))).toEqual([]);
    expect(mineralLignende.filter((s) => !tillatt.mineral.includes(s))).toEqual([]);
  });
});
