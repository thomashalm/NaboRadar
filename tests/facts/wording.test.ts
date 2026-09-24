import { describe, expect, it } from "vitest";
import { describeContaminatedSummary, describeFact, SOURCES } from "@/lib/facts/wording";
import type { AreaAttributes } from "@/types/area-feature";

const describe_ = (subtype: string, attributes: AreaAttributes = {}, contains = false, title = "Test", externalId: string | null = null) =>
  describeFact({ subtype, title, attributes, contains, externalId });

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
  /** Majorstuen skole, slik kilden faktisk har lokaliteten. */
  const MAJORSTUEN: AreaAttributes = {
    lokalitetType: "forurensetGrunn",
    paavirkningsgrad: "ikkeAkseptabelForurensning",
    prosessStatus: "undersøkelseIgangsatt",
    tilstandsklasse: null,
    arealbruk: "tjenesteytelse",
    arealM2: 3298,
    registrertAar: 2019,
    harStoffopplysninger: false,
  };
  const majorstuen = (contains = false) =>
    describe_("forurenset_grunn", MAJORSTUEN, contains, "Majorstuen skole", "13919-A")!;

  it("bruker lokalitetsnavnet som overskrift", () => {
    expect(majorstuen().headline).toBe("Majorstuen skole");
  });

  it("sier tydelig om søkepunktet ligger innenfor eller utenfor", () => {
    expect(majorstuen(false).details[0]).toBe("Søkepunktet ligger utenfor lokaliteten.");
    expect(majorstuen(true).details[0]).toBe("Søkepunktet ligger innenfor denne lokaliteten.");
  });

  it("antyder aldri at eiendommen det søkes på er forurenset", () => {
    const text = [majorstuen().headline, ...majorstuen().details, majorstuen().caveat].join(" ");
    expect(text).not.toMatch(/forurensning på eiendommen|forurenset eiendom|farlig område|eiendommen din/i);
    // «her» kan leses som søkepunktet, og skal ikke stå i et kort for en lokalitet ved siden av.
    expect(majorstuen(false).details.join(" ")).not.toMatch(/registrert .*her\b/i);
  });

  it("sier eksplisitt at kilden ikke oppgir forurensningstype", () => {
    expect(majorstuen().details).toContain("Kilden oppgir ikke hvilken type forurensning som er registrert.");
  });

  it("holder hovedteksten kort og uten kildekoder", () => {
    const details = majorstuen().details;
    expect(details).toEqual([
      "Søkepunktet ligger utenfor lokaliteten.",
      "Tilstanden er vurdert som ikke akseptabel, og det er behov for tiltak. Undersøkelser er igangsatt.",
      "Kilden oppgir ikke hvilken type forurensning som er registrert.",
    ]);
    expect(details.join(" ")).not.toMatch(/påvirkningsgrad|undersøkelseIgangsatt|forurensetGrunn/);
  });

  it("flytter kildens koder, arealbruk og årstall under «Detaljer»", () => {
    expect(majorstuen().technical).toEqual([
      "Påvirkningsgrad 3 – ikke akseptabel tilstand, behov for tiltak",
      "Lokalitetstype: forurensetGrunn",
      "Prosesstatus: undersøkelseIgangsatt",
      "Arealbruk: offentlig eller privat tjenesteytelse",
      "3\u00a0300 m²",
      "registrert 2019",
      "Lokalitet-ID: 13919-A",
    ]);
  });

  it("nevner lokalitetstypen bare når den sier noe mer enn «forurenset grunn»", () => {
    const deponi = describe_("forurenset_grunn", { ...MAJORSTUEN, lokalitetType: "deponi" }, false, "Grønmo")!;
    expect(deponi.details.join(" ")).toContain("Registrert som et nedlagt eller eksisterende deponi.");
    const skytebane = describe_("forurenset_grunn", { ...MAJORSTUEN, lokalitetType: "skytebane" }, false, "Løvenskiold")!;
    expect(skytebane.details.join(" ")).toContain("Registrert som en skytebane.");
    expect(majorstuen().details.join(" ")).not.toContain("Registrert som");
  });

  it("sier ikke noe om naboeiendommer", () => {
    expect(majorstuen().caveat).toContain("ikke nødvendigvis hele eiendommen eller naboeiendommene");
  });

  it("gjentar ikke «uavklart» både som grad og som prosesstatus", () => {
    const text = describe_(
      "forurenset_grunn",
      { ...MAJORSTUEN, paavirkningsgrad: "ukjentPåvirkning", prosessStatus: "uavklart" },
      false,
      "Middelthuns gate 27",
    )!;
    const vurdering = text.details.find((d) => d.includes("uavklart"))!;
    expect(vurdering).toBe("Det er mistanke om forurensning eller for lite informasjon, og oppfølgingen er uavklart.");
    expect(text.details.join(" ").match(/uavklart/g)).toHaveLength(1);
  });

  it("gjetter ikke type når kilden mangler lokalitetstype", () => {
    const text = describe_("forurenset_grunn", { paavirkningsgrad: "ukjentPåvirkning" }, false, "Sørkedalsveien 7 - 13")!;
    expect(text.details.join(" ")).not.toContain("Registrert som");
    expect(text.details.join(" ")).toContain("mistanke om forurensning");
  });

  it("gjengir tilstandsklasse med kildens egen etikett", () => {
    const text = describe_("forurenset_grunn", { tilstandsklasse: "farligAvfall" }, false, "Boliden Odda")!;
    // «farlig avfall» er Miljødirektoratets egen klassenavn, ikke vår vurdering av stedet.
    expect(text.details.join(" ")).toContain("Høyeste registrerte tilstandsklasse: anses som farlig avfall.");
  });

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
    expect(text.headline).toBe("118 registrerte lokaliteter innen 1 km");
    expect(text.details[0]).toContain("11 ikke akseptabel – behov for tiltak");
    expect(text.details[0]).toContain("89 akseptabel med dagens arealbruk");
    expect(text.caveat).toContain("bygge- og gravesaker");
  });
});

describe("infrastruktur", () => {
  it("opplyser at jordkabler ikke inngår", () => {
    expect(describe_("kraftledning", { spenningKv: 300, nettnivaa: "transmisjon" })!.caveat).toContain("Jordkabler");
    expect(describe_("hoyspent_distribusjon", { spenningKv: 22 })!.caveat).toContain("Jordkabler");
  });
});
