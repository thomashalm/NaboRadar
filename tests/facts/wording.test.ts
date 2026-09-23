import { describe, expect, it } from "vitest";
import { describeContaminatedSummary, describeFact, SOURCES } from "@/lib/facts/wording";
import type { AreaAttributes } from "@/types/area-feature";

const describe_ = (subtype: string, attributes: AreaAttributes = {}, contains = false, title = "Test") =>
  describeFact({ subtype, title, attributes, contains });

/** Ord vi aldri skal bruke: vurderinger, «score», boligverdi eller oppfordringer. */
const FORBIDDEN = [
  /farlig/i,
  /bekymr/i,
  /boligverdi/i,
  /dårlig område/i,
  /utrygt/i,
  /score/i,
  /vi anbefaler/i,
  /bør du klage/i,
  /høy fare/i,
  /stor risiko/i,
];

const ALL_SUBTYPES = [
  "forurenset_grunn",
  "kvikkleire_sone",
  "kvikkleire_utredet_uten_fare",
  "kvikkleire_aktsomhet",
  "transformatorstasjon",
  "kraftledning",
  "hoyspent_distribusjon",
  "industrianlegg",
  "avfallsanlegg",
  "stoy_strategisk_veg",
  "stoy_strategisk_bane",
  "stoysone_veg_t1442",
  "stoysone_fly_t1442",
];

describe("formuleringsregisteret", () => {
  it("bruker aldri vurderende ord", () => {
    const attributes: AreaAttributes = {
      paavirkningsgrad: "ikkeAkseptabelForurensning",
      faregrad: "Høy",
      konsekvens: "meget_alvorlig",
      risikoklasse: 5,
      stabilitet: "paavist_lav_sikkerhet",
      undersokelse: "enkel",
      vurdertAar: 2011,
      spenningKv: 132,
      eier: "ELVIA AS",
      nettnivaa: "regional",
      bransje: "38.320 - Deponering av avfall",
      myndighet: "Miljødirektoratet",
      niva: "70–75 dB",
      sone: "rod",
      lufthavn: "ENGM",
      beregnetAar: 2022,
      prognoseAar: 2040,
    };
    for (const subtype of ALL_SUBTYPES) {
      const text = describe_(subtype, attributes, true);
      expect(text, subtype).not.toBeNull();
      const all = [text!.headline, ...text!.details, text!.caveat ?? ""].join(" ");
      for (const pattern of FORBIDDEN) expect(all, `${subtype} / ${pattern}`).not.toMatch(pattern);
    }
  });

  it("gir null for ukjent subtype, slik at UI-et ikke finner på tekst", () => {
    expect(describe_("noe_vi_ikke_kjenner")).toBeNull();
  });

  it("har kildeinformasjon for alle providere og oppslag", () => {
    for (const id of [
      "mdir-forurenset-grunn",
      "mdir-industri-tillatelse",
      "nve-kvikkleire-soner",
      "nve-kvikkleire-aktsomhet",
      "nve-nettanlegg",
      "nve-hoyspent-distribusjon",
      "mdir-stoy-strategisk",
      "svv-stoysone-veg",
      "avinor-stoysone-fly",
    ]) {
      expect(SOURCES[id], id).toBeDefined();
      expect(SOURCES[id]!.licenseName.length).toBeGreaterThan(0);
    }
  });
});

describe("kvikkleire: de tre nivåene holdes fra hverandre", () => {
  const sone = (extra: AreaAttributes) =>
    describe_("kvikkleire_sone", { omradetype: "losneomrade", faregrad: "Høy", konsekvens: "meget_alvorlig", risikoklasse: 4, undersokelse: "enkel", vurdertAar: 2011, ...extra }, true, "Alfaset vest")!;

  it("skiller «mulig kvikkleire» fra «påvist»", () => {
    expect(sone({ stabilitet: "mulig" }).details.join(" ")).toContain("ikke påvist");
    expect(sone({ stabilitet: "mulig" }).details.join(" ")).toContain("mulig kvikkleire");
    expect(sone({ stabilitet: "paavist_lav_sikkerhet" }).details.join(" ")).toContain("Kvikkleire er påvist");
  });

  it("viser klassifiseringen som sonens, ikke eiendommens", () => {
    const text = sone({ stabilitet: "mulig" });
    expect(text.details.join(" ")).toContain("faregrad høy · konsekvens meget alvorlig · risikoklasse 4 av 5");
    expect(text.caveat).toContain("gjelder hele sonen, ikke den enkelte eiendom");
  });

  it("viser utførte sikringstiltak og år for vurderingen", () => {
    const text = sone({ stabilitet: "paavist_lav_sikkerhet", undersokelse: "sikringstiltak_utfort", vurdertAar: 2023 });
    expect(text.details.join(" ")).toContain("sikringstiltak utført");
    expect(text.details.join(" ")).toContain("vurdert 2023");
  });

  it("skiller løsneområde og utløpsområde", () => {
    expect(sone({ omradetype: "utlopsomrade", stabilitet: "mulig" }).headline).toContain("utløpsområde");
    expect(sone({ omradetype: "losneomrade", stabilitet: "mulig" }).headline).toContain("løsneområde");
  });

  it("aktsomhetsområde presenteres som aktsomhet, ikke som påvist fare", () => {
    const text = describe_("kvikkleire_aktsomhet", {}, true)!;
    expect(text.headline).toContain("aktsomhetsområde");
    expect(text.details.join(" ")).toContain("Kvikkleire er ikke påvist");
    expect(text.details.join(" ")).toContain("geoteknisk vurdering");
  });

  it("«ikke fare for områdeskred» vises bare når punktet er innenfor, og aldri som fare", () => {
    expect(describe_("kvikkleire_utredet_uten_fare", { vurdertAar: 2025 }, false)).toBeNull();
    const inside = describe_("kvikkleire_utredet_uten_fare", { vurdertAar: 2025 }, true)!;
    expect(inside.headline).toContain("ikke fare for områdeskred");
    expect(inside.details.join(" ")).toContain("2025");
  });
});

describe("støy", () => {
  it("viser dB-intervall og skiller strategisk kartlegging fra T-1442", () => {
    const strategisk = describe_("stoy_strategisk_veg", { niva: "55–59 dB" }, true)!;
    expect(strategisk.headline).toContain("Lden 55–59 dB");
    expect(strategisk.details.join(" ")).toContain("strategisk støykartlegging");

    const varsel = describe_("stoysone_veg_t1442", { sone: "gul", kilde: "ERF-veger", prognoseAar: 2040 }, true)!;
    expect(varsel.headline).toContain("gul støysone");
    expect(varsel.caveat).toContain("ikke skal brukes til detaljvurdering av enkeltboliger");
  });

  it("uten dB-verdi vises ingenting", () => {
    expect(describe_("stoy_strategisk_veg", {}, true)).toBeNull();
  });
});

describe("forurenset grunn", () => {
  it("oppsummerer etter påvirkningsgrad i stedet for bare antall", () => {
    const text = describeContaminatedSummary({
      total: 118,
      byGrade: [
        { grade: "ikkeAkseptabelForurensning", count: 11 },
        { grade: "ukjentPåvirkning", count: 6 },
        { grade: "akseptabelForurensning", count: 89 },
        { grade: "liteForurensning", count: 12 },
      ],
      radiusLabel: "1 km",
    });
    expect(text.headline).toBe("118 registrerte lokaliteter med forurenset grunn innen 1 km");
    expect(text.details[0]).toContain("11 ikke akseptabel – behov for tiltak");
    expect(text.details[0]).toContain("89 akseptabel med dagens arealbruk");
    expect(text.caveat).toContain("bygge- og gravesaker");
  });

  it("gjengir kildens påvirkningsgrad", () => {
    const text = describe_("forurenset_grunn", { paavirkningsgrad: "ikkeAkseptabelForurensning" }, false, "Registrert lokalitet med forurenset grunn")!;
    expect(text.details[0]).toContain("påvirkningsgrad 3");
  });
});

describe("infrastruktur", () => {
  it("opplyser at jordkabler ikke inngår", () => {
    expect(describe_("kraftledning", { spenningKv: 300, nettnivaa: "transmisjon" })!.caveat).toContain("Jordkabler");
    expect(describe_("hoyspent_distribusjon", { spenningKv: 22 })!.caveat).toContain("Jordkabler");
  });
});
