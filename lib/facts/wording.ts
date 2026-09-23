import { formatArea } from "@/lib/format";
import type { AreaAttributes } from "@/types/area-feature";

/**
 * Formuleringsregister for områdefakta.
 *
 * ALL tekst om områdefakta skal komme herfra. UI-et setter aldri sammen egne setninger
 * fra rådata. Reglene er:
 *  - bruk kildens egne klasser og ord («aktsomhet» er ikke «fare»)
 *  - ingen vurdering, ingen score, ingen påstand om boligverdi
 *  - kildens egne forbehold følger med som `caveat`
 *  - årstall vises når kilden har det
 */

export interface FactText {
  headline: string;
  details: string[];
  caveat: string | null;
  /** Kildens egne koder og klasser. Vises bare under «Detaljer». */
  technical?: string[];
}

export interface SourceInfo {
  name: string;
  owner: string;
  licenseName: string;
  licenseUrl: string;
}

/** Kilde per provider/lookup. Vises alltid sammen med faktaene. */
export const SOURCES: Record<string, SourceInfo> = {
  "mdir-forurenset-grunn": {
    name: "Forurenset grunn",
    owner: "Miljødirektoratet",
    licenseName: "NLOD 2.0",
    licenseUrl: "https://data.norge.no/nlod/no/2.0",
  },
  "mdir-industri-tillatelse": {
    name: "Industri med utslippstillatelse",
    owner: "Miljødirektoratet",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "nve-kvikkleire-soner": {
    name: "Kartlagte kvikkleiresoner",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "nve-kvikkleire-aktsomhet": {
    name: "Aktsomhetskart for kvikkleireskred",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "nve-nettanlegg": {
    name: "Nettanlegg",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "nve-hoyspent-distribusjon": {
    name: "Distribusjonsnett",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "mdir-stoy-strategisk": {
    name: "Strategisk støykartlegging",
    owner: "Miljødirektoratet",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "svv-stoysone-veg": {
    name: "Støyvarselkart for veg",
    owner: "Statens vegvesen",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "avinor-stoysone-fly": {
    name: "Flystøysoner",
    owner: "Avinor",
    licenseName: "Åpne data",
    licenseUrl: "https://kartkatalog.geonorge.no/metadata/1489f7f8-40c8-4dc4-83b6-bcf277b56506",
  },
};

/**
 * Forurenset grunn — Miljødirektoratets vurdering i klartekst.
 * Tallkoden («påvirkningsgrad 3») er teknisk og hører hjemme under «Detaljer».
 */
const PAAVIRKNINGSGRAD_SETNING: Record<string, string> = {
  liteForurensning: "Myndigheten har vurdert stedet som lite eller ikke forurenset, uten behov for tiltak uansett arealbruk.",
  akseptabelForurensning: "Myndigheten har vurdert tilstanden som akseptabel med dagens arealbruk.",
  ikkeAkseptabelForurensning: "Myndigheten har vurdert tilstanden som ikke akseptabel, og det er behov for tiltak.",
  ukjentPåvirkning: "Det er mistanke om forurensning eller lite informasjon om stedet, og oppfølgingen er uavklart.",
};

/** Kildens offisielle etiketter, ordrett fra tegnforklaringen. Vises under «Detaljer». */
const PAAVIRKNINGSGRAD_TEKNISK: Record<string, string> = {
  liteForurensning: "Påvirkningsgrad 1 – lite eller ikke forurenset, ikke behov for tiltak uansett arealbruk",
  akseptabelForurensning: "Påvirkningsgrad 2 – akseptabel tilstand med dagens arealbruk",
  ikkeAkseptabelForurensning: "Påvirkningsgrad 3 – ikke akseptabel tilstand, behov for tiltak",
  ukjentPåvirkning: "Påvirkningsgrad X – mistanke/lite informasjon, oppfølging uavklart",
};

/** Kort etikett til listen «Se alle registreringer i området». */
export const PAAVIRKNINGSGRAD_SHORT: Record<string, string> = {
  ikkeAkseptabelForurensning: "ikke akseptabel – behov for tiltak",
  akseptabelForurensning: "akseptabel med dagens arealbruk",
  liteForurensning: "lite eller ikke forurenset",
  ukjentPåvirkning: "uavklart",
};

/** Hvor langt saken er kommet hos forurensningsmyndigheten. */
const PROSESS_STATUS_SETNING: Record<string, string> = {
  uavklart: "Oppfølgingen er foreløpig uavklart.",
  undersøkelseIgangsatt: "Undersøkelser er igangsatt.",
  undersøkelseGjennomført: "Undersøkelser er gjennomført.",
  tiltakIgangsatt: "Tiltak er igangsatt.",
  tiltakGjennomført: "Tiltak er gjennomført.",
  overvåking: "Lokaliteten overvåkes.",
  avsluttet: "Saken er avsluttet.",
};

/** Hva slags sted kilden har registrert. Oversettelser av kildens egne koder — ingen tolkning. */
const LOKALITET_TYPE_SETNING: Record<string, string> = {
  forurensetGrunn: "forurenset grunn",
  deponi: "et nedlagt eller eksisterende deponi",
  deponiKommunalt: "et kommunalt deponi",
  skipsverft: "et skipsverft",
  industriEllerNæring: "en industri- eller næringslokalitet",
  krigsetterlatenskaper: "krigsetterlatenskaper",
  skytebane: "en skytebane",
  avfall: "avfall",
  mellomlager: "et mellomlager",
  nyttiggjøringavfall: "nyttiggjøring av avfall",
  sedimentFerskvann: "forurenset sediment i ferskvann",
  sedimentSaltvann: "forurenset sediment i sjø",
};

/** Arealbruk med Miljødirektoratets egne etiketter, slik de står i faktaarket. */
const AREALBRUK_TEXT: Record<string, string> = {
  bebyggelseBolig: "Boligbebyggelse",
  bebyggelseAnnen: "Annen bebyggelse og anlegg",
  sentrumsområder: "Sentrumsområder, kontor og forretninger",
  tjenesteytelse: "Offentlig eller privat tjenesteytelse",
  industriOgTrafikk: "Industri og trafikkarealer",
  ubebygd: "Andre ubebygde områder",
  INFOmråde: "Landbruk-, natur- og friluftslivområde",
};

/** Målt tilstandsklasse. Oppgitt for om lag en fjerdedel av lokalitetene. */
const TILSTANDSKLASSE_TEXT: Record<string, string> = {
  megetGod: "1 – meget god",
  god: "2 – god",
  moderat: "3 – moderat",
  dårlig: "4 – dårlig",
  sværtDårlig: "5 – svært dårlig",
  overNormverdi: "over normverdi",
  farligAvfall: "anses som farlig avfall",
};

const STABILITET_TEXT: Record<string, string> = {
  paavist_lav_sikkerhet: "Kvikkleire er påvist i sonen, med beregnet sikkerhetsfaktor under 1,4",
  paavist_ikke_vurdert: "Kvikkleire er påvist i sonen, stabiliteten er ikke vurdert",
  paavist_tilfredsstillende: "Kvikkleire er påvist i sonen, med beregnet sikkerhetsfaktor over 1,4",
  mulig: "Kvikkleire er ikke påvist – sonen er vurdert som mulig kvikkleire",
  ikke_fare: "Utredet: ikke fare for områdeskred",
};

const UNDERSOKELSE_TEXT: Record<string, string> = {
  ingen: "ingen undersøkelse",
  enkel: "enkel undersøkelse",
  supplerende: "supplerende undersøkelser av stabilitet",
  sikringstiltak_utfort: "sikringstiltak utført",
};

const KONSEKVENS_TEXT: Record<string, string> = {
  ingen: "ingen",
  mindre_alvorlig: "mindre alvorlig",
  alvorlig: "alvorlig",
  meget_alvorlig: "meget alvorlig",
};

const FAREGRAD_TEXT: Record<string, string> = { Lav: "lav", Middels: "middels", Høy: "høy", Ingen: "ingen" };

const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

/**
 * Én registrert lokalitet med forurenset grunn.
 *
 * Kortet skal svare på hvor registreringen ligger, hva slags sted det er, og hva myndigheten
 * mener om det. Kilden har ingen stoffopplysninger, og det sies eksplisitt i stedet for å gjette.
 */
function forurensetGrunn(input: { title: string; attributes: AreaAttributes; contains: boolean; externalId: string | null }): FactText {
  const { title, attributes: a, contains, externalId } = input;
  const details: string[] = [];

  details.push(contains ? "Søkepunktet ligger innenfor denne lokaliteten." : "Søkepunktet ligger utenfor lokaliteten.");

  const type = LOKALITET_TYPE_SETNING[str(a.lokalitetType) ?? ""];
  details.push(
    type
      ? `Miljødirektoratet har registrert ${type} her.`
      : "Miljødirektoratet har registrert denne lokaliteten i databasen over forurenset grunn.",
  );

  const vurdering = [PAAVIRKNINGSGRAD_SETNING[str(a.paavirkningsgrad) ?? ""], PROSESS_STATUS_SETNING[str(a.prosessStatus) ?? ""]]
    .filter(Boolean)
    .join(" ");
  if (vurdering) details.push(vurdering);

  const tilstand = TILSTANDSKLASSE_TEXT[str(a.tilstandsklasse) ?? ""];
  if (tilstand) details.push(`Høyeste registrerte tilstandsklasse: ${tilstand}.`);

  // Stofflistene ligger ikke i kildens åpne data, og for mange lokaliteter finnes de ikke i det hele tatt.
  details.push("Kilden oppgir ikke hvilken type forurensning som er registrert.");

  const arealbruk = AREALBRUK_TEXT[str(a.arealbruk) ?? ""];
  const areal = num(a.arealM2);
  const fakta = [
    arealbruk ? `Arealbruk: ${arealbruk.charAt(0).toLowerCase()}${arealbruk.slice(1)}` : null,
    areal !== null && areal > 0 ? formatArea(areal) : null,
    num(a.registrertAar) ? `registrert ${num(a.registrertAar)}` : null,
  ].filter(Boolean);
  if (fakta.length > 0) details.push(fakta.join(" · "));

  return {
    headline: `Registrert lokalitet: ${title}`,
    details,
    caveat:
      "Registreringen gjelder denne lokaliteten i Miljødirektoratets database, ikke nødvendigvis hele eiendommen eller naboeiendommene.",
    technical: [
      PAAVIRKNINGSGRAD_TEKNISK[str(a.paavirkningsgrad) ?? ""] ?? null,
      str(a.lokalitetType) ? `Lokalitetstype: ${str(a.lokalitetType)}` : null,
      str(a.prosessStatus) ? `Prosesstatus: ${str(a.prosessStatus)}` : null,
      externalId ? `Lokalitet-ID: ${externalId}` : null,
    ].filter((line): line is string => line !== null),
  };
}

function kvikkleireSone(title: string, a: AreaAttributes, contains: boolean): FactText {
  const omradetype = a.omradetype === "utlopsomrade" ? "utløpsområde" : "løsneområde";
  const details: string[] = [];

  const stabilitet = STABILITET_TEXT[str(a.stabilitet) ?? ""];
  const undersokelse = UNDERSOKELSE_TEXT[str(a.undersokelse) ?? ""];
  const aar = num(a.vurdertAar);
  if (stabilitet) details.push(aar ? `${stabilitet} (vurdert ${aar}).` : `${stabilitet}.`);
  if (undersokelse) details.push(`Undersøkelsesnivå: ${undersokelse}.`);

  const faregrad = FAREGRAD_TEXT[str(a.faregrad) ?? ""];
  const konsekvens = KONSEKVENS_TEXT[str(a.konsekvens) ?? ""];
  const risiko = num(a.risikoklasse);
  if (faregrad && faregrad !== "ingen") {
    const parts = [`faregrad ${faregrad}`];
    if (konsekvens && konsekvens !== "ingen") parts.push(`konsekvens ${konsekvens}`);
    if (risiko !== null) parts.push(`risikoklasse ${risiko} av 5`);
    details.push(`NVEs klassifisering av sonen: ${parts.join(" · ")}.`);
  }

  return {
    headline: `${contains ? "Søkepunktet ligger i" : "Kartlagt"} kvikkleiresone «${title}» (${omradetype})`,
    details,
    caveat:
      "Klassifiseringen gjelder hele sonen, ikke den enkelte eiendom. NVE oppgir at datasettet primært er ment for vurdering på kommuneplannivå.",
  };
}

/**
 * Bygger teksten for ett faktum. Ukjent subtype gir null, slik at UI-et heller viser
 * ingenting enn en setning vi ikke har godkjent.
 */
export function describeFact(input: {
  subtype: string;
  title: string;
  attributes: AreaAttributes;
  contains: boolean;
  /** Kildens egen ID, vist under «Detaljer» der kilden har en offentlig lokalitet-ID. */
  externalId?: string | null;
}): FactText | null {
  const { subtype, title, attributes: a, contains } = input;

  switch (subtype) {
    case "forurenset_grunn":
      return forurensetGrunn({ title, attributes: a, contains, externalId: input.externalId ?? null });

    case "kvikkleire_sone":
      return kvikkleireSone(title, a, contains);

    case "kvikkleire_utredet_uten_fare":
      // Vises kun når punktet ligger inni. Dette er en positiv opplysning, ikke en fare.
      if (!contains) return null;
      return {
        headline: `Søkepunktet ligger i et område NVE har utredet: ikke fare for områdeskred`,
        details: num(a.vurdertAar) ? [`Vurdert ${num(a.vurdertAar)}.`] : [],
        caveat: null,
      };

    case "kvikkleire_aktsomhet":
      return {
        headline: "Søkepunktet ligger i aktsomhetsområde for kvikkleireskred",
        details: [
          "Aktsomhetskartet viser hvor det kan være marin leire i skrånende terreng. Kvikkleire er ikke påvist.",
          "Ved byggetiltak i et slikt område krever NVE at det innhentes geoteknisk vurdering.",
        ],
        caveat: "Kartet er et oversiktskart (1:50 000) og sier ikke noe om forholdene på den enkelte eiendom.",
      };

    case "transformatorstasjon": {
      const kv = num(a.spenningKv);
      return {
        headline: `Transformatorstasjon «${title}»`,
        details: [[kv !== null ? `${kv} kV` : null, str(a.eier)].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: null,
      };
    }

    case "kraftledning": {
      const kv = num(a.spenningKv);
      const nett = str(a.nettnivaa) === "transmisjon" ? "transmisjonsnett" : "regionalnett";
      return {
        headline: `Kraftledning i ${nett}${title && title !== "Kraftledning" ? ` («${title}»)` : ""}`,
        details: [[kv !== null ? `${kv} kV` : null, str(a.eier)].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: "Jordkabler inngår ikke i NVEs åpne data.",
      };
    }

    case "hoyspent_distribusjon": {
      const kv = num(a.spenningKv);
      return {
        headline: "Høyspentledning i distribusjonsnettet",
        details: [[kv !== null ? `${kv} kV` : null, str(a.eier)].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: "Bare luftledninger NVE publiserer åpent. Jordkabler inngår ikke, og avstanden sier derfor ikke alt.",
      };
    }

    case "industrianlegg":
    case "avfallsanlegg": {
      const details: string[] = [];
      const bransje = str(a.bransje);
      if (bransje) details.push(bransje);
      const utslipp = [a.utslippLuft === true ? "luft" : null, a.utslippVann === true ? "vann" : null].filter(Boolean);
      if (utslipp.length > 0) details.push(`Rapporterer utslipp til ${utslipp.join(" og ")}.`);
      const aar = num(a.sisteRapporteringAar);
      if (aar) details.push(`Siste rapportering: ${aar}.`);
      return {
        headline:
          subtype === "avfallsanlegg"
            ? `Avfalls- eller gjenvinningsanlegg med utslippstillatelse: ${title}`
            : `Anlegg med utslippstillatelse: ${title}`,
        details,
        caveat: `Tillatelse gitt av ${str(a.myndighet) ?? "forurensningsmyndigheten"}. Posisjonen er ett punkt for anlegget, ikke tomtegrensen.`,
      };
    }

    case "stoy_strategisk_veg":
    case "stoy_strategisk_bane": {
      const level = str(a.niva);
      const kilde = subtype === "stoy_strategisk_veg" ? "veitrafikk" : "bane (tog, T-bane eller trikk)";
      if (!level) return null;
      return {
        headline: `Beregnet støy fra ${kilde} ved søkepunktet: Lden ${level}`,
        details: ["Fra strategisk støykartlegging etter EU-støydirektivet, kartlagt 2022."],
        caveat: "Dette er en modellberegning for området, ikke en måling ved boligen.",
      };
    }

    case "stoysone_veg_t1442": {
      const sone = a.sone === "rod" ? "rød" : "gul";
      const aar = num(a.prognoseAar);
      return {
        headline: `Søkepunktet ligger i ${sone} støysone for veitrafikk (T-1442)`,
        details: [
          [str(a.kilde), aar ? `prognoseår ${aar}` : null].filter(Boolean).join(" · ") || "Statens vegvesens støyvarselkart.",
        ],
        caveat: "Statens vegvesen oppgir at støyvarselkartet ikke skal brukes til detaljvurdering av enkeltboliger.",
      };
    }

    case "stoysone_fly_t1442": {
      const sone = a.sone === "rod" ? "rød" : "gul";
      const aar = num(a.beregnetAar);
      return {
        headline: `Søkepunktet ligger i ${sone} flystøysone (T-1442)`,
        details: [[str(a.lufthavn), aar ? `beregnet ${aar}` : null].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: "Sonene er modellberegnet for lufthavnen, ikke målt ved boligen.",
      };
    }

    default:
      return null;
  }
}

/**
 * Oppsummering for forurenset grunn. Vises bare inne i «Se alle registreringer i området» —
 * et antall alene er misvisende, fordi databasen er tett i byer.
 */
export function describeContaminatedSummary(input: {
  total: number;
  byGrade: { grade: string; count: number }[];
  radiusLabel: string;
}): FactText {
  const parts = input.byGrade
    .filter((g) => g.count > 0)
    .map((g) => `${g.count} ${PAAVIRKNINGSGRAD_SHORT[g.grade] ?? "uten oppgitt grad"}`);
  return {
    headline: `${input.total} registrerte lokaliteter innen ${input.radiusLabel}`,
    details: parts.length > 0 ? [`Fordeling etter Miljødirektoratets påvirkningsgrad: ${parts.join(", ")}.`] : [],
    caveat:
      "Databasen inneholder også registreringer fra bygge- og gravesaker, og er derfor tett i byer. Antallet sier ikke noe om forholdene på en enkelt eiendom.",
  };
}

/** Lenketekst per kildetype. */
export function linkLabelFor(sourceUrlType: string | null, providerId: string): string {
  if (sourceUrlType === "factsheet") return providerId === "mdir-forurenset-grunn" ? "Se faktaark hos Miljødirektoratet" : "Se faktaark";
  if (sourceUrlType === "report") return "Se rapport hos NVE";
  return "Se kilden";
}
