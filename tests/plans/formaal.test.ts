import { describe, expect, it } from "vitest";
import {
  dokumentHarTaptLigatur,
  finnFormaal,
  finnFormaalIDokumenter,
  finnFormaalISkjema,
  harTaptLigatur,
  kortFormaal,
  utenMengder,
  FORMAAL_MAKS_TEGN,
} from "@/lib/plans/formaal";

/**
 * Tekstutdrag fra ekte planinitiativ, varsler og referater hos DiBK (hentet 2026-10-03), med
 * linjeskift slik tekstlaget i PDF-en har dem. Feilene som testes er de som faktisk ble funnet.
 */
const SKJEMA = (hensikt: string) =>
  `Varsel om oppstart av planarbeid\nNavn på planforslaget: Testplan Arealplan-ID: 2024001 Saksnummer: 2024 / 1\nHensikten med planarbeidet\n${hensikt}\nKrav til konsekvensutredning\nFor denne planen er det ikke krav om konsekvensutredning.`;

describe("formålssetning i løpende tekst", () => {
  it("«Formålet med planarbeidet er å …»", () => {
    const tekst = "2. Formålet med planen\nFormålet med reguleringsplanen er å legge til rette for fortsatt drift og uttak av løsmasser i\neksisterende massetak, samt utvidelse av masseuttaket. Reguleringsplanen medfører …";
    expect(finnFormaal(tekst)).toBe(
      "å legge til rette for fortsatt drift og uttak av løsmasser i eksisterende massetak, samt utvidelse av masseuttaket",
    );
  });

  it("«Planarbeidet har til hensikt å …» og «Planen skal legge til rette for …»", () => {
    expect(finnFormaal("2.1 Hensikt\nPlanarbeidet har til hensikt å tilrettelegge for utbygging av boligbebyggelse innenfor eiendommen 10/69, i Småvika like vest for Strusshamn senter. Det er …")).toBe(
      "å tilrettelegge for utbygging av boligbebyggelse innenfor eiendommen 10/69, i Småvika like vest for Strusshamn senter",
    );
    expect(finnFormaal("Planen skal legge til rette for et nytt kryssingsspor ved Dallerud, da dette er det lengste strekket uten kryssingsmulighet mellom Hamar og Lillehammer. Videre …")).toBe(
      "legge til rette for et nytt kryssingsspor ved Dallerud, da dette er det lengste strekket uten kryssingsmulighet mellom Hamar og Lillehammer",
    );
  });

  it("setter sammen ord som er delt over linjeskift", () => {
    expect(finnFormaal("Formålet med planarbeidet er å gjennomføre en områderegulering for nærings‐\nområdet nord på Kverve. Planen …")).toBe(
      "å gjennomføre en områderegulering for næringsområdet nord på Kverve",
    );
  });

  it("stopper ikke ved punktum i forkortelser, gnr/bnr og datoer", () => {
    expect(finnFormaal("Hensikten med planarbeidet er å legge til rette for to fritidsboliger med tilhørende anlegg, båthus/overnatting og brygge/kaianlegg innenfor gnr. 7 bnr. 38 og bnr. 791. Det er …")).toBe(
      "å legge til rette for […] fritidsboliger med tilhørende anlegg, båthus/overnatting og brygge/kaianlegg innenfor gnr. 7 bnr. 38 og bnr. 791",
    );
  });

  it("forkaster setninger som er kuttet, innholdsløse eller ikke handler om saken", () => {
    // Kuttet ved «ca.» fulgt av et tall på neste linje som tekstlaget har mistet.
    expect(finnFormaal("Formålet med planarbeidet er å legge til rette for utbygging av ca.")).toBeNull();
    expect(finnFormaal("Formålet med planen er å være i tråd med overordnet plan. Arealene er avsatt …")).toBeNull();
    expect(finnFormaal("Formålet med planarbeidet er å: • legge til rette for boliger • sikre grønnstruktur.")).toBeNull();
    // Kuttet ved en forkortelse midt i et navn eller en henvisning.
    expect(finnFormaal("Formålet med planen er å rive «pakkhuset» mellom byggets fasader mot henholdsvis Skippergata og Fred. Olsens gate. Mer.")).toBeNull();
    expect(finnFormaal("Formålet med planen er å legge til rette for utbygging i tråd med Langtidsplan for forsvarssektoren, Prop. 87 S. Mer.")).toBeNull();
    expect(finnFormaal("Formålet med planen er å legge til rette for utbygging av eiendommene med boliger i 3-8 et. Mer.")).toBeNull();
    // Referattekst uten formålsformulering gir ingenting, selv om «legge til rette for» står der.
    expect(finnFormaal("Kommunen mener det bør legges til rette for mellomlagring av løsmasser og at dette bør nevnes i planbeskrivelsen.")).toBeNull();
    expect(finnFormaal("Innholdsfortegnelse 2. Formålet med planen ........................ 4")).toBeNull();
  });

  it("forkaster for korte og for lange setninger", () => {
    expect(finnFormaal("Formålet med planen er å bygge. Mer tekst.")).toBeNull();
    expect(finnFormaal(`Formålet med planen er å legge til rette for ${"bolig og næring og ".repeat(30)}mer. Slutt.`)).toBeNull();
    const funnet = finnFormaal("Formålet med planen er å legge til rette for etablering av Nye Narvik videregående skole (VGS). Mer.");
    expect(funnet!.length).toBeLessThanOrEqual(FORMAAL_MAKS_TEGN);
  });
});

describe("skjemafeltet «Hensikten med planarbeidet»", () => {
  it("finner en eksplisitt formålssetning i feltet", () => {
    expect(finnFormaalISkjema(SKJEMA("Formålet med planarbeidet er å legge til rette for et nytt og moderne vindkraftverk. Planområdet ligger …"))).toBe(
      "å legge til rette for et nytt og moderne vindkraftverk",
    );
    expect(finnFormaalISkjema(SKJEMA("Hensikt med planen er å legge til rette for utvidelse av eksisterende rehabiliterings- og sykehusbygning. Videre …"))).toBe(
      "å legge til rette for utvidelse av eksisterende rehabiliterings- og sykehusbygning",
    );
  });

  it("gir ingenting når feltet bare viser videre eller beskriver prosessen", () => {
    for (const felt of [
      "Se vedlegg.",
      "Se vedlegg",
      "Varsel om utvidelse av planområdet - se vedlegg.",
      "I henhold til plan- og bygningsloven § 12-8 varsles det oppstart av mindre endring.",
      "Det gjøres oppmerksom på at dette er et varsel om utvidelse av foreløpig planavgrensning.",
    ]) {
      expect(finnFormaalIDokumenter([{ id: "1", type: "Planvarsel", date: null, text: SKJEMA(felt) }]), felt).toBeNull();
    }
  });

  it("første setning brukes ikke når feltet handler om saksgangen", () => {
    for (const felt of [
      "Dette er en påminner om nabomøte 8. september kl 18 på Tina, Instituttvegen 18. Velkommen.",
      '11. mai 2026 ble det sendt ut varsel om "Forelegging av reguleringsendring etter forenkla prosess". Planområdet utvides.',
      "Endring av reguleringsplan Batteriveien 20 i Frogn kommune (Plan nr. 086-4100) etter enklere prosess. Mer.",
      "Frist for merknader er satt til 1. desember. Merknader sendes kommunen.",
    ]) {
      expect(finnFormaalIDokumenter([{ id: "1", type: "Planvarsel", date: null, text: SKJEMA(felt) }]), felt).toBeNull();
    }
  });

  it("første setning brukes når den beskriver tiltaket", () => {
    for (const [felt, forventet] of [
      ["Det foreslås mindre endringer i gjeldende regulering for gbnr. 11/1529 ved justering av avgrensning av arealformål og hensynssone. For nærmere informasjon …", "Det foreslås mindre endringer i gjeldende regulering for gbnr. 11/1529 ved justering av avgrensning av arealformål og hensynssone"],
      ["Ein søker om å endre reguleringsplanen for å tilpassa skytearenaen ved Midthølen til Kvinnherad Skytterlag sine utviklingsplanar i området. Vidare …", "Ein søker om å endre reguleringsplanen for å tilpassa skytearenaen ved Midthølen til Kvinnherad Skytterlag sine utviklingsplanar i området"],
    ] as const) {
      expect(finnFormaalIDokumenter([{ id: "1", type: "Planvarsel", date: null, text: SKJEMA(felt) }])?.formaal).toBe(forventet);
    }
  });

  it("bruker første setning i feltet som den står, når ingenting annet finnes", () => {
    const funn = finnFormaalIDokumenter([{ id: "v", type: "ref-data-as-pdf", date: null, text: SKJEMA('Endre reguleringsformål fra "forsamlingslokale" til "bolig". Et mindre tiltak.') }]);
    expect(funn).toMatchObject({ formaal: 'Endre reguleringsformål fra "forsamlingslokale" til "bolig"', metode: "skjemafelt_forste_setning" });
  });
});

describe("tekstlag uten ligaturer", () => {
  const ØDELAGT = "Hensikten med planarbeidet\nFormålet med planen er å legge  l re e for utvidelse av eksisterende sykehus innenfor areal avsa   l offentlig eller privat tjenestey ng. Krav  l konsekvensutredning\nInnspill  l varsel om oppstart kan sendes  l kommunen.";

  it("oppdager setninger og dokumenter der «ti» og «tt» har falt ut", () => {
    expect(harTaptLigatur("å legge l re e for utvidelse")).toBe(true);
    expect(harTaptLigatur("å sikre en arealeffek v utvikling")).toBe(true);
    expect(harTaptLigatur("å lre elegge for boligbygging med lhørende infrastruktur")).toBe(true);
    expect(harTaptLigatur("å legge til rette for boliger i en park")).toBe(false);
    expect(dokumentHarTaptLigatur("å legge l re e for boliger l kommunen og l fylket")).toBe(true);
    expect(dokumentHarTaptLigatur("å legge til rette for boliger til kommunen")).toBe(false);
  });

  it("gir ikke formål fra et slikt dokument, og går videre til neste dokument", () => {
    expect(finnFormaal(ØDELAGT)).toBeNull();
    expect(finnFormaalISkjema(ØDELAGT)).toBeNull();
    const funn = finnFormaalIDokumenter([
      { id: "varsel", type: "Planvarsel", date: "2026-01-01", text: ØDELAGT },
      { id: "initiativ", type: "Planinitiativ", date: "2025-12-01", text: "Formålet med planen er å legge til rette for utvidelse av eksisterende Åsgård psykiatriske sykehus. Videre …" },
    ]);
    expect(funn).toMatchObject({ documentId: "initiativ", documentType: "Planinitiativ" });
  });

  it("skriver ut ligaturer som finnes som egne tegn", () => {
    expect(finnFormaal("Formålet med planen er å sikre en arealeﬀektiv utvikling av barnehagetomta og ﬂere plasser. Mer.")).toBe(
      "å sikre en arealeffektiv utvikling av barnehagetomta og flere plasser",
    );
  });
});

describe("tall vises ikke", () => {
  it("mengder erstattes med […], også tallord og intervaller", () => {
    expect(utenMengder("å legge til rette for utbygging av ca. 70 boenheter, fordelt på småhusbebyggelse og blokker")).toBe(
      "å legge til rette for utbygging av […] boenheter, fordelt på småhusbebyggelse og blokker",
    );
    expect(utenMengder("å legge til rette for 12 tilrettelagte boliger med tilhørende uteoppholdsarealer")).toBe(
      "å legge til rette for […] tilrettelagte boliger med tilhørende uteoppholdsarealer",
    );
    expect(utenMengder("arealer for boliger i 3 etasjer over plan 1")).toBe("arealer for boliger i […] etasjer over plan 1");
    expect(utenMengder("utvidelse av barnehagen fra 4 til 10 avdelinger")).toBe("utvidelse av barnehagen fra […] avdelinger");
    expect(utenMengder("et nytt høydebasseng på 5300 m³ i tilknytning til anlegget")).toBe("et nytt høydebasseng på […] m³ i tilknytning til anlegget");
    expect(utenMengder("å etablere et datasenter på 150 MW på eiendommen")).toBe("å etablere et datasenter på […] MW på eiendommen");
    expect(utenMengder("inntil 15 000 m2 BRA næring")).toBe("[…] m2 BRA næring");
    expect(utenMengder("å legge til rette for to fritidsboliger")).toBe("å legge til rette for […] fritidsboliger");
    expect(utenMengder("utnyttelse på 40 % BYA")).toBe("utnyttelse på […] % BYA");
  });

  it("mengder skrevet sammen med ordet fjernes også", () => {
    expect(utenMengder("en 8-mannsbolig i 2etasjer (blokk)")).toBe("en […]-mannsbolig i […]etasjer (blokk)");
    expect(utenMengder("ny 7-avdelings barnehage i sentrum")).toBe("ny […]-avdelings barnehage i sentrum");
  });

  it("tegn fra en ødelagt skrifttabell forkaster setningen", () => {
    expect(finnFormaal("Formålet med planen er å =lre9elegge for boligbebyggelse for alle aldersgrupper på Sporafjell. Mer.")).toBeNull();
  });

  it("navn og referanser blir stående", () => {
    for (const tekst of [
      "på eiendommen Karrestadveien 63",
      "gang- og sykkelløsning mot sykkelstamveien langs E18 ved Varoddbrua",
      "næringstomter langs med Fv42 som også kan bidra",
      "innenfor gnr. 7 bnr. 38 og bnr. 791",
      "eiendom gnr/bnr 47/60",
      "etablering av dagligvareforretning (REMA 1000) og kontorarealer",
      "i delområde BFS1 i gjeldende reguleringsplan",
      "reguleringsplanen fra 2016 ble vedtatt",
    ]) {
      expect(utenMengder(tekst), tekst).toBe(tekst);
    }
  });

  it("et formål som bare var en mengde, forkastes", () => {
    expect(finnFormaal("Formålet med planen er å legge til rette for 70 boliger. Mer.")).toBeNull();
  });

  it("ingen siffer foran en enhet slipper gjennom i et uttrukket formål", () => {
    const funn = finnFormaal("Formålet med planarbeidet er å legge til rette for ca. 125 boenheter i 5 til 7 etasjer med 1000 kvm næring og 140 parkeringsplasser i kjeller. Mer.");
    expect(funn).not.toMatch(/\d/);
    expect(funn).toContain("[…]");
  });
});

describe("prioritering mellom dokumenter", () => {
  const initiativ = { id: "i", type: "Planinitiativ", date: "2026-01-10", text: "Formålet med planarbeidet er å legge til rette for boligbebyggelse med tilhørende anlegg. Mer." };
  const referat = { id: "r", type: "ReferatOppstartsmoete", date: "2026-02-01", text: "Formålet med planen er å regulere området til boligbebyggelse, variert bebyggelse. Mer." };

  it("skjemafeltet i varselet først, så planinitiativet, så referatet", () => {
    const varsel = { id: "v", type: "ref-data-as-pdf", date: "2026-03-01", text: SKJEMA("Formålet med planarbeidet er å etablere et datasenter med tilhørende teknisk infrastruktur. Mer.") };
    expect(finnFormaalIDokumenter([referat, initiativ, varsel])).toMatchObject({ documentId: "v", metode: "skjemafelt" });
    expect(finnFormaalIDokumenter([referat, initiativ])).toMatchObject({ documentId: "i", metode: "setning" });
    expect(finnFormaalIDokumenter([referat])).toMatchObject({ documentId: "r", documentType: "ReferatOppstartsmoete" });
  });

  it("første setning i skjemafeltet brukes sist, etter en eksplisitt setning i planinitiativet", () => {
    const varsel = { id: "v", type: "ref-data-as-pdf", date: "2026-03-01", text: SKJEMA("Endring av reguleringsplan Batteriveien 20 i Frogn kommune etter enklere prosess. Mer.") };
    expect(finnFormaalIDokumenter([varsel, initiativ])).toMatchObject({ documentId: "i" });
  });

  it("nyeste dokument av samme type først, og andre dokumenttyper leses ikke", () => {
    const gammel = { ...initiativ, id: "gammel", date: "2025-01-01", text: "Formålet med planarbeidet er å legge til rette for næringsbebyggelse og lager. Mer." };
    expect(finnFormaalIDokumenter([gammel, initiativ])).toMatchObject({ documentId: "i" });
    expect(finnFormaalIDokumenter([{ ...initiativ, type: "PlanomraadePdf" }, { ...initiativ, type: "Annet" }])).toBeNull();
    expect(finnFormaalIDokumenter([])).toBeNull();
  });
});

describe("kort utgave til kortet", () => {
  it("kutter ved ordgrense og markerer kuttet", () => {
    const lang = "å legge til rette for boligbebyggelse med næringslokaler, fellesareal, innganger, bil- og sykkelparkering mm i første etasje og delvis under terreng, og leiligheter i øvrige etasjer";
    const kort = kortFormaal(lang);
    expect(kort.length).toBeLessThanOrEqual(152);
    expect(kort.endsWith(" …")).toBe(true);
    expect(lang.startsWith(kort.slice(0, -2))).toBe(true);
    expect(kortFormaal("å etablere et datasenter")).toBe("å etablere et datasenter");
  });
});
