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

  /**
   * Standardvisningen er kort, men skillet mellom mulig, påvist og friskmeldt må stå der —
   * ikke gjemt bak «Detaljer». Det tekniske, som sikkerhetsfaktor og undersøkelsesnivå, er
   * flyttet dit med ordlyden i behold.
   */
  it("skiller «mulig kvikkleire» fra «påvist» i standardvisningen", () => {
    expect(sone({ stabilitet: "mulig" }).details[0]).toBe("Mulig kvikkleire, ikke påvist");
    expect(sone({ stabilitet: "paavist_lav_sikkerhet" }).details[0]).toBe("Kvikkleire påvist");
    expect(sone({ stabilitet: "paavist_tilfredsstillende" }).details[0]).toBe("Kvikkleire påvist");
  });

  it("beholder sikkerhetsfaktoren under «Detaljer», ikke i standardvisningen", () => {
    const lav = sone({ stabilitet: "paavist_lav_sikkerhet" });
    expect(lav.technical?.join(" ")).toContain("sikkerhetsfaktor under 1,4");
    const høy = sone({ stabilitet: "paavist_tilfredsstillende" });
    expect(høy.technical?.join(" ")).toContain("sikkerhetsfaktor over 1,4");
    // De to har samme korte linje, så forskjellen må være etterprøvbar under Detaljer.
    expect(lav.details).toEqual(høy.details);
  });

  it("viser faregrad og risikoklasse i standardvisningen", () => {
    expect(sone({ stabilitet: "mulig" }).details[1]).toBe("Faregrad høy · risikoklasse 4 av 5");
  });

  it("holder klassifiseringens forbehold og det tekniske under «Detaljer»", () => {
    const text = sone({ stabilitet: "paavist_lav_sikkerhet", undersokelse: "sikringstiltak_utfort", vurdertAar: 2023 });
    const teknisk = text.technical?.join(" ") ?? "";
    expect(teknisk).toContain("sikringstiltak utført");
    expect(teknisk).toContain("Vurdert 2023");
    expect(teknisk).toContain("Konsekvens: meget alvorlig");
    expect(teknisk).toContain("gjelder hele sonen, ikke den enkelte eiendom");
  });

  it("skiller løsneområde og utløpsområde", () => {
    expect(sone({ omradetype: "utlopsomrade", stabilitet: "mulig" }).technical?.join(" ")).toContain("utløpsområde");
    expect(sone({ omradetype: "losneomrade", stabilitet: "mulig" }).technical?.join(" ")).toContain("løsneområde");
  });

  it("skiller kartlagt sone fra sone ved søkepunktet", () => {
    expect(describe_("kvikkleire_sone", { stabilitet: "mulig" }, false, "Smalvollveien")!.headline).toBe(
      "Kartlagt kvikkleiresone «Smalvollveien»",
    );
    expect(describe_("kvikkleire_sone", { stabilitet: "mulig" }, true, "Smalvollveien")!.headline).toBe(
      "Søkepunktet ligger i kvikkleiresone «Smalvollveien»",
    );
  });

  it("aktsomhetsområde presenteres som aktsomhet, ikke som påvist fare", () => {
    const text = describe_("kvikkleire_aktsomhet", {}, true)!;
    expect(text.headline).toBe("Aktsomhetsområde for kvikkleireskred");
    expect(text.details.join(" ")).toContain("Kvikkleire er ikke påvist");
    // Kravet om geoteknisk vurdering og målestokken står fortsatt, under «Detaljer».
    expect(text.technical?.join(" ")).toContain("geoteknisk vurdering");
    expect(text.technical?.join(" ")).toContain("1:50 000");
    expect(text.technical?.join(" ")).toContain("den enkelte eiendom");
  });

  it("«ikke fare for områdeskred» vises bare når punktet er innenfor, og aldri som fare", () => {
    expect(describe_("kvikkleire_utredet_uten_fare", { vurdertAar: 2025 }, false)).toBeNull();
    const inside = describe_("kvikkleire_utredet_uten_fare", { vurdertAar: 2025 }, true)!;
    expect(inside.headline).toContain("ikke fare for områdeskred");
    expect(inside.technical?.join(" ")).toContain("2025");
  });
});

describe("støy", () => {
  it("viser dB-intervall og skiller strategisk kartlegging fra T-1442", () => {
    const strategisk = describe_("stoy_strategisk_veg", { niva: "55–59 dB" }, true)!;
    expect(strategisk.headline).toContain("Lden 55–59 dB");
    // Metoden står én gang i «Kilder og metode», ikke på hvert kort.
    expect(strategisk.details).toEqual(["Gul støysone fra 55 dB, rød fra 65 dB (T-1442)"]);
    // Rettet 2026-10-08: kilden sto som «kartlagt 2022» samlet, men banekartene viser 2017.
    expect(SOURCES["mdir-stoy-strategisk"]!.method).toContain("Veitrafikk: situasjonen i 2022. Jernbane: situasjonen i 2017.");
    // Året står på funnet når oppslaget oppgir det, og er da kildens år for akkurat den støykilden.
    expect(describe_("stoy_strategisk_bane", { niva: "55–59 dB", kartlagtAar: 2017 }, true)!.details).toContain(
      "Støykartet viser situasjonen i 2017.",
    );
    expect(strategisk.headline).not.toContain("søkepunktet");

    const varsel = describe_("stoysone_veg_t1442", { sone: "gul", kilde: "ERF-veger", prognoseAar: 2040 }, true)!;
    expect(varsel.headline).toBe("Gul støysone for veitrafikk (T-1442)");
    // Statens vegvesens eget forbehold er en egenskap ved kartet, og står ved kilden.
    expect(SOURCES["svv-stoysone-veg"]!.method).toContain("ikke skal brukes til detaljvurdering av enkeltboliger");
  });

  /**
   * QA Langmyrgrenda 26 (2026-10-04): 50–54 dB fra gata utenfor ble vist likt som et høyt nivå,
   * med «Ved søkepunktet» som om det var målt ved huset. Grensene er T-1442 tabell 1.
   */
  describe("referanse mot T-1442", () => {
    const linje = (subtype: string, nedre: number, ovre: number | null) =>
      describe_(subtype, { niva: "x dB", nedre, ovre }, true)!.details[0];

    it("vei 50–54 ligger under gul støysone, og sier det", () => {
      expect(linje("stoy_strategisk_veg", 50, 54)).toBe("Under gul støysone (gul fra 55 dB)");
    });

    it("vei fra 55 og opp får grensene som referanse, uten å bli kalt en sone", () => {
      for (const [nedre, ovre] of [[55, 59], [60, 64], [65, 69], [70, 74], [75, null]] as const) {
        const tekst = linje("stoy_strategisk_veg", nedre, ovre)!;
        expect(tekst).toBe("Gul støysone fra 55 dB, rød fra 65 dB (T-1442)");
        expect(tekst).not.toMatch(/tilsvarer|ligger i|^(Gul|Rød) støysone$/i);
      }
    });

    it("bane har egne grenser, og et intervall som krysser gul grense kalles ikke «under»", () => {
      expect(linje("stoy_strategisk_bane", 50, 54)).toBe("Under gul støysone (gul fra 58 dB)");
      // 55–59 ligger på begge sider av 58. Da oppgir vi bare grensene.
      expect(linje("stoy_strategisk_bane", 55, 59)).toBe("Gul støysone fra 58 dB, rød fra 68 dB (T-1442)");
      expect(linje("stoy_strategisk_bane", 65, 69)).toBe("Gul støysone fra 58 dB, rød fra 68 dB (T-1442)");
    });

    it("storbylaget sier at gatene rundt er med; riksveglaget gjør det ikke", () => {
      const by = describe_("stoy_strategisk_veg", { niva: "50–54 dB", nedre: 50, ovre: 54, byomrade: true }, true)!;
      expect(by.details).toEqual(["Under gul støysone (gul fra 55 dB)", "Modellert for alle gater i byområdet."]);
      const riks = describe_("stoy_strategisk_veg", { niva: "50–54 dB", nedre: 50, ovre: 54, byomrade: false }, true)!;
      expect(riks.details).toEqual(["Under gul støysone (gul fra 55 dB)"]);
    });

    it("ingen ord som vurderer nivået", () => {
      const alt = JSON.stringify([
        describe_("stoy_strategisk_veg", { niva: "50–54 dB", nedre: 50, ovre: 54, byomrade: true }, true),
        describe_("stoy_strategisk_bane", { niva: "over 75 dB", nedre: 75, ovre: null }, true),
      ]);
      expect(alt).not.toMatch(/lavt|moderat|høyt|farlig|usunt|problematisk|helse/i);
    });
  });

  describe("status uten treff", () => {
    const tekst = (a: Record<string, string | boolean>) => describe_("stoy_strategisk_status", a, true);
    const linjer = (a: Record<string, string | boolean>) => { const t = tekst(a)!; return [t.headline, t.details[0] ?? null]; };

    it("kartlagt i byområde, begge under 50 dB", () => {
      expect(linjer({ vegDekning: "by", baneDekning: "by", vegTreff: false, baneTreff: false })).toEqual([
        "Lavt modellert støynivå fra vei og bane ved søkepunktet.",
        "Under 50 dB i støykartene.",
      ]);
    });

    it("nevner bare kilden som er dekket og uten treff", () => {
      expect(linjer({ vegDekning: "by", baneDekning: "by", vegTreff: true, baneTreff: false })).toEqual([
        "Lavt modellert støynivå fra bane ved søkepunktet.",
        "Under 50 dB i støykartet.",
      ]);
      expect(linjer({ vegDekning: "by", baneDekning: "by", vegTreff: false, baneTreff: true })).toEqual([
        "Lavt modellert støynivå fra veitrafikk ved søkepunktet.",
        "Under 50 dB i støykartet.",
      ]);
      expect(linjer({ vegDekning: "by", baneDekning: "ingen", vegTreff: false, baneTreff: false })[0]).toBe(
        "Lavt modellert støynivå fra veitrafikk ved søkepunktet.",
      );
    });

    it("utenfor byområdene sier setningen at bare de mest trafikkerte strekningene er med", () => {
      expect(linjer({ vegDekning: "hoved", baneDekning: "ingen", vegTreff: false, baneTreff: false })).toEqual([
        "Lavt modellert støynivå fra de mest trafikkerte veiene ved søkepunktet.",
        "Under 50 dB i støykartet.",
      ]);
      expect(linjer({ vegDekning: "ingen", baneDekning: "hoved", vegTreff: false, baneTreff: false })).toEqual([
        "Lavt modellert støynivå fra de mest trafikkerte jernbanestrekningene ved søkepunktet.",
        "Under 55 dB i støykartet.",
      ]);
      // Ulike terskler: begge står.
      expect(linjer({ vegDekning: "hoved", baneDekning: "hoved", vegTreff: false, baneTreff: false })[1]).toBe(
        "Under 50 dB for vei og 55 dB for jernbane i støykartene.",
      );
    });

    it("«lavt» brukes aldri uten dekning: ikke kartlagt er ikke et funn om støy", () => {
      const s = tekst({ vegDekning: "ingen", baneDekning: "ingen", vegTreff: false, baneTreff: false })!;
      expect(s.headline).toBe("Området er ikke med i den strategiske støykartleggingen av vei og bane.");
      expect(s.details).toEqual([]);
      expect(s.headline).not.toMatch(/lavt|under \d+ dB/i);
    });

    it("overdriver ikke: gjelder de nevnte kildene, ikke all støy", () => {
      const alle = [
        { vegDekning: "by", baneDekning: "by", vegTreff: false, baneTreff: false },
        { vegDekning: "hoved", baneDekning: "hoved", vegTreff: false, baneTreff: false },
        { vegDekning: "ingen", baneDekning: "ingen", vegTreff: false, baneTreff: false },
      ].map((a) => linjer(a).join(" "));
      for (const s of alle) expect(s).not.toMatch(/ingen støy|stille|lite støy|svært lavt|ved boligen/i);
      // «Lavt» står alltid sammen med «modellert» og kildene det gjelder.
      for (const s of alle.slice(0, 2)) expect(s).toMatch(/^Lavt modellert støynivå fra /);
    });

    it("har ingenting å si når alt som er dekket har treff", () => {
      expect(tekst({ vegDekning: "by", baneDekning: "by", vegTreff: true, baneTreff: true })).toBeNull();
    });
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

  it("sier tydelig fra når søkepunktet ligger innenfor, og gjentar ikke avstanden når det ligger utenfor", () => {
    expect(majorstuen(true).details[0]).toBe("Søkepunktet ligger innenfor denne lokaliteten.");
    // Utenfor: avstanden ved navnet («130 m unna») sier det; ingen egen linje på hvert kort.
    expect(majorstuen(false).details.join(" ")).not.toMatch(/søkepunktet/i);
  });

  it("antyder aldri at eiendommen det søkes på er forurenset", () => {
    const text = [majorstuen().headline, ...majorstuen().details, majorstuen().caveat].join(" ");
    expect(text).not.toMatch(/forurensning på eiendommen|forurenset eiendom|farlig område|eiendommen din/i);
    // «her» kan leses som søkepunktet, og skal ikke stå i et kort for en lokalitet ved siden av.
    expect(majorstuen(false).details.join(" ")).not.toMatch(/registrert .*her\b/i);
  });

  it("sier eksplisitt at kilden ikke oppgir forurensningstype — én gang, ved kilden", () => {
    expect(SOURCES["mdir-forurenset-grunn"]!.method).toContain("Kilden oppgir ikke hvilken type forurensning som er registrert.");
    expect(majorstuen().details.join(" ")).not.toContain("Kilden oppgir ikke");
  });

  it("holder hovedteksten kort og uten kildekoder", () => {
    const details = majorstuen().details;
    expect(details).toEqual([
      "Tilstanden er vurdert som ikke akseptabel, og det er behov for tiltak. Undersøkelser er igangsatt.",
    ]);
    expect(details.join(" ")).not.toMatch(/påvirkningsgrad|undersøkelseIgangsatt|forurensetGrunn/);
  });

  it("flytter kildens koder, arealbruk og årstall under «Detaljer»", () => {
    expect(majorstuen().technical).toEqual([
      "Påvirkningsgrad 3 – ikke akseptabel tilstand, behov for tiltak",
      // Kildens koder oversatt — ingen «forurensetGrunn» eller «undersøkelseIgangsatt» i UI-et.
      "Lokalitetstype: forurenset grunn",
      "Status: undersøkelser er igangsatt",
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

  it("sier ikke noe om naboeiendommer — forbeholdet står én gang, ved kilden", () => {
    expect(SOURCES["mdir-forurenset-grunn"]!.method).toContain("ikke nødvendigvis hele eiendommen eller naboeiendommene");
    expect(majorstuen().caveat).toBeNull();
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
