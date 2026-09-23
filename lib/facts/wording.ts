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

const PAAVIRKNINGSGRAD_TEXT: Record<string, string> = {
  liteForurensning: "Lite eller ikke forurenset – ikke behov for tiltak uansett arealbruk (påvirkningsgrad 1)",
  akseptabelForurensning: "Akseptabel forurensning med dagens arealbruk (påvirkningsgrad 2)",
  ikkeAkseptabelForurensning: "Ikke akseptabel forurensning – behov for tiltak (påvirkningsgrad 3)",
  ukjentPåvirkning: "Mistanke om forurensning, oppfølging uavklart (påvirkningsgrad X)",
};

/** Kort etikett til oppsummeringen av forurenset grunn. */
export const PAAVIRKNINGSGRAD_SHORT: Record<string, string> = {
  ikkeAkseptabelForurensning: "ikke akseptabel – behov for tiltak",
  akseptabelForurensning: "akseptabel med dagens arealbruk",
  liteForurensning: "lite eller ikke forurenset",
  ukjentPåvirkning: "uavklart",
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
}): FactText | null {
  const { subtype, title, attributes: a, contains } = input;

  switch (subtype) {
    case "forurenset_grunn": {
      const grad = PAAVIRKNINGSGRAD_TEXT[str(a.paavirkningsgrad) ?? ""];
      return {
        headline: contains ? `${title} – søkepunktet ligger innenfor` : title,
        details: grad ? [grad] : [],
        caveat: "Registreringen gjelder en lokalitet i Miljødirektoratets database, ikke nødvendigvis en enkelt eiendom.",
      };
    }

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
 * Oppsummering for forurenset grunn. Tettheten i byer gjør en ren opptelling misvisende,
 * så vi viser fordelingen på kildens egne påvirkningsgrader.
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
    headline: `${input.total} registrerte lokaliteter med forurenset grunn innen ${input.radiusLabel}`,
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
