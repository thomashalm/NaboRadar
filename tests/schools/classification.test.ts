import { describe, expect, it } from "vitest";
import { classifySchool } from "@/lib/schools/classification";

/**
 * Hvilke enheter i Udirs skoleregister som vises i den offentlige skolelisten.
 *
 * Navn og næringskoder er slik de sto i registeret 2026-10-04. Regelen er målt mot alle 3 101
 * aktive skoler (docs/research/skolefilter-offentlig-visning.md); disse testene holder fast de
 * tilfellene som avgjorde hvordan den ble.
 */
const grunn = (name: string, primaryNace: string | null) => classifySchool({ name, primaryNace }).hiddenReason;
const regel = (name: string, primaryNace: string | null) => classifySchool({ name, primaryNace }).rule;

describe("vanlige skoler vises", () => {
  const vanlige: [string, string][] = [
    ["Løren skole", "85.201"], ["Sørkedalen skole", "85.201"], ["Fernanda Nissen skole", "85.201"], ["Bjørnholt ungdomsskole", "85.201"],
    ["Bjøråsen skole", "85.201"], ["Kronstad Oppveksttun skole", "85.201"], ["Haukeland skole", "85.201"], ["Strindheim skole", "85.201"],
    ["Steindal skole", "85.201"], ["Tjensvoll skole", "85.201"], ["Vaulen skole", "85.201"], ["Kristianslyst skole", "85.201"],
    ["Bjerkaker skole", "85.201"], ["Fagereng skole", "85.201"], ["Sunde skole", "85.201"], ["Odda ungdomsskole", "85.201"],
    ["Søyland skole", "85.201"], ["Kautokeino skole", "85.201"], ["Lom ungdomsskule", "85.201"], ["Odda barneskole", "85.201"],
    ["Trøgstad ungdomsskole", "85.201"], ["Presterød ungdomsskole", "85.201"], ["Voksen skole", "85.201"],
    ["Møllergata videregående skole", "85.310"], ["Bjerke videregående skole", "85.310"], ["Trondheim katedralskole", "85.310"],
    ["Cissi Klein videregående skole", "85.320"], ["Laksevåg og Bergen Maritime videregående skole", "85.320"], ["Røros videregående skole", "85.310"],
    ["Flora vidaregåande skule", "85.310"], ["Sandvika videregående skole", "85.310"], ["Færder videregående skole", "85.320"],
    ["Sentrum videregående skole", "85.310"], ["Jotunheimen vidaregåande skule AS", "85.310"], ["Bergen katedralskole", "85.310"],
  ];
  it.each(vanlige)("%s (%s)", (navn, kode) => expect(grunn(navn, kode)).toBeNull());
});

describe("næringskoden er hovedregelen", () => {
  it.each([
    ["Eksamenskontoret i Akershus", "85.699", "exam_office"],
    ["Privatistkontoret i Rogaland", "85.699", "exam_office"],
    ["Telemark fylkeskommune Privatisteksamen", "85.699", "exam_office"],
    ["Oslo voksenopplæring Rosenhof", "85.593", "adult_education"],
    ["Larvik kommune Larvik læringssenter", "85.593", "adult_education"],
    ["Lillehammer læringssenter", "85.593", "adult_education"],
    ["Karriere Innlandet Hamar", "85.593", "adult_education"],
    ["Kompetansebyggeren", "85.593", "adult_education"],
    ["Åsnes opplæringssenter", "85.593", "adult_education"],
    ["Fagskulen Vestland Nordnes", "85.404", "vocational_college"],
    ["Norges Grønne fagskole - Vea", "85.404", "vocational_college"],
    ["Ansgar bibelskole AS", "85.403", "bible_school"],
    ["Tønsberg bibelskole AS", "85.595", "bible_school"],
  ] as const)("%s (%s) → %s", (navn, kode, forventet) => {
    expect(grunn(navn, kode)).toBe(forventet);
    expect(regel(navn, kode)).toBe("nace");
  });

  it("en ukjent kode i 85.4–85.6 skjules som «annen opplæringsenhet»", () => {
    expect(classifySchool({ name: "Noe helt annet", primaryNace: "85.610" })).toEqual({ hiddenReason: "other_nonstandard", rule: "nace" });
  });

  it("koder utenfor 85.4–85.6 skjuler ingen", () => {
    for (const kode of ["85.201", "85.202", "85.310", "85.320", "85.100", "88.990", "01.190"]) expect(grunn("Solbakken skole", kode)).toBeNull();
  });
});

describe("smal navneregel for enheter med ordinær næringskode", () => {
  it.each([
    ["Privatisteksamen", "85.310", "exam_office"],
    ["Nettskolen Innlandet", "85.310", "online_school"],
    ["Nettskulen i Vestland", "85.310", "online_school"],
    ["Trøndelag nettskole", "85.310", "online_school"],
    ["Karriere Agder Kristiansand", "85.320", "adult_education"],
    ["Vefsn voksenopplæring", "85.201", "adult_education"],
    ["Åfjord kommune voksenopplæring", "85.201", "adult_education"],
    ["Austevoll kommune Vaksenopplæringa", "85.201", "adult_education"],
    ["Filadelfia bibelskole", "85.320", "bible_school"],
    ["Bibelskolen i Grimstad", "85.320", "bible_school"],
    ["Sjøforsvarets fagskole", "85.320", "vocational_college"],
  ] as const)("%s → %s", (navn, kode, forventet) => {
    expect(grunn(navn, kode)).toBe(forventet);
    expect(regel(navn, kode)).toBe("name");
  });

  it("blandede enheter der en ordinær skole inngår, skjules ikke av navnet", () => {
    expect(grunn("Mellomåsen skole og voksenopplæring", "85.201")).toBeNull();
    expect(grunn("Åsveien skole og ressurssenter", "85.201")).toBeNull();
    // … men næringskoden gjelder fortsatt.
    expect(grunn("Mellomåsen skole og voksenopplæring", "85.593")).toBe("adult_education");
  });

  it("er ikke bred: ord som ligner, treffer ikke", () => {
    for (const navn of ["Voksen skole", "Karrierebakken skole", "Fagerheim skole", "Nettlandet skole", "Bibelen barneskole", "Eksamen skole"]) {
      expect(grunn(navn, "85.201")).toBeNull();
    }
  });
});

describe("gråsoner som bevisst står", () => {
  it("administrative enheter filtreres ikke — risikoen for å skjule ekte skoler er større enn gevinsten", () => {
    for (const navn of [
      "Lillesand kommune - Sentraladministrasjon skole",
      "Porsgrunn kommune Vikarer Grunnskole/Sfo",
      "Suldal kommune Skulefagleg Rådgjevar",
      "Halden kommune Felles Grunnskoletjeneste",
    ]) expect(grunn(navn, "85.201")).toBeNull();
  });

  it("læringssentre og kompetansesentre med ordinær kode står", () => {
    for (const navn of ["Johannes læringssenter Flerspråklige Barn", "Lom kompetansesenter", "Stange kommune kvalifiseringssenter", "Oslo Vo Hovinbyen"]) {
      expect(grunn(navn, "85.201")).toBeNull();
    }
  });
});

describe("ukjent vises", () => {
  it("uten næringskode gjelder bare navneregelen", () => {
    expect(classifySchool({ name: "Solbakken skole", primaryNace: null })).toEqual({ hiddenReason: null, rule: null });
    // Skoler uten elevtall eller trinn er ikke et signal, og når ikke regelen i det hele tatt.
    expect(grunn("Fjellhamar skole", null)).toBeNull();
    expect(classifySchool({ name: "Eksamenskontoret i Østfold", primaryNace: null })).toEqual({ hiddenReason: "exam_office", rule: "name" });
  });
});
