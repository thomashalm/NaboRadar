import { describe, expect, it } from "vitest";
import { klassifiserTiltak, TILTAKSTYPE_LABELS, TILTAKSTYPER } from "@/lib/plans/tiltakstype";

/**
 * Ekte sakstitler og formålssetninger fra DiBK «Planlegging igangsatt», hentet 2026-10-03
 * (docs/research/planer-og-saker-v2.md). Typen skal være riktig eller «annet», aldri feil.
 */
const type = (title: string, formaal?: string) => klassifiserTiltak({ title, formaal }).type;

describe("tiltakstype fra tittel", () => {
  it.each([
    ["Flodda boligområde II", "bolig"],
    ["Reguleringsendring for Boligområde Leidland nord for RV 502, gnr. 7 bnr. 68", "bolig"],
    ["Detaljregulering for bustader på gnr.28 bnr.150, Kverneland", "bolig"],
    ["Detaljregulering for Vardatua Hyttefelt", "fritidsbolig"],
    ["Detaljregulering for fritidsbebyggelse – BF29 Søre Krossvikbukta", "fritidsbolig"],
    ["DETALJREGULERING FOR KJETSÅ NÆRINGSPARK", "naering"],
    ["Vestheim industriområde", "industri"],
    ["Detaljregulering for Årbogen datasenter", "datasenter"],
    ["Detaljregulering for gnr./bnr. 241/150 m.fl. på Myra industriområde på Ganddal - datasenter", "datasenter"],
    ["Utvidelse av Folbergåsen massetak", "masseuttak"],
    ["Tobruåsen masseuttak og pukkverk", "masseuttak"],
    ["Gjøvik massesenter, Åndalen", "masseuttak"],
    ["E6 Selli - Asp", "samferdsel"],
    ["Fv.496 Sømsveien gs, Randesundheimen - Sømskleiva", "samferdsel"],
    ["Detaljregulering Dallerud kryssingsspor", "samferdsel"],
    ["PLANOVERGANGSTILTAK STRAND-OPPHUS", "samferdsel"],
    ["Nye Narvik videregående skole", "skole_barnehage"],
    ["Gbnr. 17/267 m.fl. Vilberg barnehage", "skole_barnehage"],
    ["Detaljregulering for nytt sykehjem i Rakkestad", "helse_omsorg"],
    ["Detaljregulering Åsgård psykiatriske sykehus", "helse_omsorg"],
    ["Hotell ved Solastranden", "hotell_servering"],
    ["Reguleringsplan for skytearena ved Midthølen - Matre", "idrett_park"],
    ["Sjølisætra vindkraftverk", "energi"],
    ["Detaljreguleringsplan for Telneset Solkraftverk", "energi"],
    ["Milan vannbehandlingsanlegg og høydebasseng", "teknisk"],
    ["Detaljreguleringsplan for flomsikring av Augla", "teknisk"],
    ["Olav Ingstads vei 2 - Brannstasjon", "teknisk"],
  ] as const)("%s → %s", (title, forventet) => {
    expect(type(title)).toBe(forventet);
  });

  it("kjenner igjen signalet som siste ledd i et sammensatt ord", () => {
    expect(type("Havnehotell Prostneset")).toBe("hotell_servering");
    expect(type("Detaljregulering for Nordby ungdomsskole")).toBe("skole_barnehage");
    expect(type("Åsen bydelssykehjem")).toBe("helse_omsorg");
    // Men ikke i et gatenavn med husnummer.
    expect(type("Ungdomsskoleveien 4")).toBe("annet");
  });

  it("gateadresser og stedsnavn er ikke signaler", () => {
    for (const title of [
      "Tornaas' vei 8",
      "Jernbanegata 7 og 9",
      "Furnesvegen 111",
      "Skoleveien 5",
      "Sigrid Undsets veg 3",
      "Batteriveien 20",
      "Groheim",
      "Dalabekk 2",
      "Plan 543 - Stykket, Lønvarden - Gbnr. 10/709",
      "Kjøsaplassen",
    ]) {
      expect(type(title), title).toBe("annet");
    }
  });

  it("feltnavn, gatenavn og stedsnavn som ligner signaler, er ikke signaler", () => {
    // «E7» er et felt i planen, ikke en europavei. «Stadionvegen» er en gate, ikke et stadion.
    expect(type("Endring av 1085 E7 Sørlandssenteret - Bergsenteret reguleringsplan, for område Barstølveien 19")).toBe("annet");
    expect(type("Detaljregulering for Stadionvegen Øst")).toBe("annet");
    expect(type("Havnemyra og Slottet")).toBe("annet");
    expect(type("E39 Betna - Stormyra")).toBe("samferdsel");
    expect(type("Røst Havn")).toBe("naering");
    expect(type("Detaljregulering for gang- og sykkelveg Smiskaret-Sveberg")).toBe("samferdsel");
    expect(type("Detaljregulering - Turveg Frøylandsvatnet")).toBe("idrett_park");
    expect(type("IC Nykirke-Barkåker, jernbane og deponier")).toBe("annet");
    // Vegnummeret er en stedsangivelse, ikke saken.
    expect(type("Plan 202113 Detaljregulering for Dale gnr. 95 bnr. 1-4 m.fl. inkl. Fv 4494 gjennom Gramstad.")).toBe("annet");
    expect(type("Rv.41 Solsletta - Boen bru detaljregulering")).toBe("samferdsel");
    expect(type("Superb Hotel Molde")).toBe("hotell_servering");
  });

  it("gjetter ikke når tittelen peker to veier", () => {
    // Omsorgssenter og barnehage er to ulike tiltak. Ingen regel avgjør hvilket som er saken.
    expect(type("Heberheimen omsorgssenter og barnehage")).toBe("annet");
    expect(type("Mosvik sentrum")).toBe("annet");
  });

  it("følgetiltak endrer ikke typen", () => {
    expect(type("Boligområde ved Fv. 44 med ny adkomstveg")).toBe("bolig");
    expect(type("Næringsområde med ny rundkjøring")).toBe("naering");
  });
});

describe("tiltakstype fra formålssetningen", () => {
  it("brukes når tittelen er en adresse", () => {
    expect(type("Furnesvegen 111", "å legge til rette for etablering av dagligvareforretning (REMA 1000) og kontorarealer")).toBe("naering");
    expect(type("Batteriveien 20", "å tilrettelegge for boligbebyggelse med leiligheter samt tilhørende atkomstvei, parkering og leke-/uteoppholdsarealer")).toBe("bolig");
    expect(type("Detaljregulering Karrestadveien 63", "å legge til rette for etablering av […] omsorgsboliger med tilhørende personalbase på eiendommen Karrestadveien 63")).toBe("helse_omsorg");
    expect(type("Sluppenvegen 20 m.fl.", "å legge til rette for etablering av et samlet prehospitalt akuttmedisinsk miljø som skal inneholde både operative tjenester, ledelse og utviklingsmiljø")).toBe("helse_omsorg");
    expect(type("Mosvik sentrum", 'Endre reguleringsformål fra "forsamlingslokale" til "bolig"')).toBe("bolig");
  });

  it("parkering, lekeplass og atkomst i et boligformål gjør det ikke til samferdsel eller park", () => {
    expect(type("Hanna Winsnes vei 5, Almetunet", "å legge til rette for […] tilrettelagte boliger med tilhørende uteoppholdsarealer og parkering")).toBe("bolig");
  });

  it("bolig og næring sammen er en egen type", () => {
    expect(type("Bratsbergvegen 2", "å legge til rette for studentboliger med mulighet for tilhørende tjenesteyting/forretning/fellesrom i de nederste etasjene")).toBe("bolig_naering");
  });

  it("tittelen vinner over formålet, bortsett fra når formålet er et datasenter eller masseuttak på et næringsområde", () => {
    expect(type("Reguleringsplan for valen boligfelt del A", "å legge til rette for at nåværende midlertidige brakkerigg kan stå i flere år")).toBe("bolig");
    expect(type("Endring av detaljreguleringsplan for Aunvågen næringsområde", "å legge til rette for etablering av datasenter, gjennom justering av reguleringsbestemmelsene")).toBe("datasenter");
  });

  it("uklare formål gir «annet»", () => {
    expect(type("OMRÅDEREGULERING RØMÅSEN", "å tilrettelegge for videreutvikling av Sjusjøen som destinasjon, i dette tilfellet området rundt Rømåsen")).toBe("annet");
    expect(type("Groheim", "å oppnå nødvendig parkeringsdekning")).toBe("annet");
  });

  it("sier hvor typen kom fra", () => {
    expect(klassifiserTiltak({ title: "Utneset masseuttak" })).toEqual({ type: "masseuttak", kilde: "tittel" });
    expect(klassifiserTiltak({ title: "Furnesvegen 111", formaal: "å legge til rette for dagligvareforretning" })).toEqual({ type: "naering", kilde: "formaal" });
    expect(klassifiserTiltak({ title: "Groheim" })).toEqual({ type: "annet", kilde: null });
  });
});

describe("merkelapper", () => {
  it("alle typer har en merkelapp, og ukjent type heter bare «Planarbeid»", () => {
    for (const t of TILTAKSTYPER) expect(TILTAKSTYPE_LABELS[t].length).toBeGreaterThan(3);
    expect(TILTAKSTYPE_LABELS.annet).toBe("Planarbeid");
  });

  it("ingen merkelapp vurderer tiltaket", () => {
    expect(Object.values(TILTAKSTYPE_LABELS).join(" ")).not.toMatch(/negativ|positiv|risiko|trussel|bra|dårlig|aktiv/i);
  });
});
