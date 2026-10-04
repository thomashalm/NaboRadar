/**
 * Hvilke enheter i Udirs skoleregister som vises i den offentlige skolelisten.
 *
 * Registeret fører også eksamenskontor, voksenopplæring, nettskoler, fagskoler og bibelskoler som
 * «skole». Det er riktig etter registerets egen definisjon — de er godkjent for opplæring — men
 * det er ikke det en boligkjøper mener med en skole i nærområdet. Dette er et produktfilter for
 * den offentlige visningen. Enhetene ligger uendret i databasen og vises i admin, med grunnen.
 *
 * TO REGLER, i denne rekkefølgen:
 *
 * 1. **Primær næringskode.** Ordinære skoler har 85.2 (grunnskole) eller 85.3 (videregående).
 *    Er primærkoden 85.4 (høyere utdanning og fagskole), 85.5 (annen undervisning, bl.a.
 *    voksenopplæring) eller 85.6 (tjenester tilknyttet undervisning, bl.a. eksamenskontor), er
 *    enheten ikke en ordinær skole. Målt på alle 3 101 aktive skoler 2026-10-04: 50 enheter, og
 *    ingen vanlige skoler blant dem.
 * 2. **Smal navneregel**, for enheter registeret har gitt ordinær næringskode: eksamenskontor,
 *    privatist, voksenopplæring, nettskole, «Karriere …», bibelskole og fagskole. 28 enheter.
 *    Navn med «skole og …» er blandede enheter der en ordinær skole inngår («Mellomåsen skole og
 *    voksenopplæring»), og skjules ikke av navnet alene.
 *
 * UKJENT VISES. Mangler næringskoden — fordi Udir ikke svarte, eller fordi enheten er ny —
 * gjelder bare navneregelen. En feil hos Udir skal aldri skjule en ordinær skole.
 *
 * Bevisst utelatt: skolekategorien «Voksenopplæringssenter» (53 helt ordinære skoler har den),
 * elevtall (mangler for 497 av 522 videregående) og trinn (mangler for 97 grunnskoler, de fleste
 * ekte skoler). Se docs/research/skolefilter-offentlig-visning.md.
 */
export const SCHOOL_HIDDEN_REASONS = [
  "adult_education",
  "exam_office",
  "online_school",
  "vocational_college",
  "bible_school",
  "other_nonstandard",
] as const;
export type SchoolHiddenReason = (typeof SCHOOL_HIDDEN_REASONS)[number];

/** Hvilken regel som ga utfallet. Lagres, slik at admin kan se hvorfor. */
export type SchoolRule = "nace" | "name";

export interface SchoolClassification {
  /** Null = ordinær skole, eller ukjent. Begge vises offentlig. */
  hiddenReason: SchoolHiddenReason | null;
  rule: SchoolRule | null;
}

/** Til admin: hva grunnen heter på norsk. */
export const SCHOOL_HIDDEN_LABEL: Record<SchoolHiddenReason, string> = {
  adult_education: "voksenopplæring",
  exam_office: "eksamens- eller privatistkontor",
  online_school: "nettskole",
  vocational_college: "fagskole",
  bible_school: "bibelskole",
  other_nonstandard: "annen opplæringsenhet",
};

/** 85.4 høyere utdanning og fagskole, 85.5 annen undervisning, 85.6 tjenester tilknyttet undervisning. */
const IKKE_ORDINAER_NACE = /^85\.[456]/;
/** «Åsveien skole og ressurssenter», «Mellomåsen skole og voksenopplæring»: en ordinær skole inngår. */
const BLANDET_ENHET = /\bsk[ou]le og\b/i;

const NAVN: readonly [RegExp, SchoolHiddenReason][] = [
  [/eksamenskontor|privatist/i, "exam_office"],
  [/\bnettsk[ou]len?\b/i, "online_school"],
  [/bibelsk[ou]le/i, "bible_school"],
  [/\bfagsk[ou]len?\b/i, "vocational_college"],
  [/voksenoppl|vaksenoppl|^karriere\b/i, "adult_education"],
];

const fraNavn = (navn: string): SchoolHiddenReason | null => NAVN.find(([regel]) => regel.test(navn))?.[1] ?? null;

export function classifySchool(input: { name: string; primaryNace: string | null }): SchoolClassification {
  const { name, primaryNace } = input;

  if (primaryNace && IKKE_ORDINAER_NACE.test(primaryNace)) {
    // Næringskoden avgjør at enheten skjules. Navnet brukes bare til å si hva slags enhet det er.
    const grunn =
      fraNavn(name) ??
      (primaryNace === "85.593" ? "adult_education" : primaryNace.startsWith("85.4") ? "vocational_college" : "other_nonstandard");
    return { hiddenReason: grunn, rule: "nace" };
  }

  if (BLANDET_ENHET.test(name)) return { hiddenReason: null, rule: null };
  const grunn = fraNavn(name);
  return grunn ? { hiddenReason: grunn, rule: "name" } : { hiddenReason: null, rule: null };
}
