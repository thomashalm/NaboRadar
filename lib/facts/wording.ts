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

/**
 * Radonklassene slik NGU navngir dem i det publiserte kartet, ikke omgjort til nye nivåer.
 * Kilden har fire klasser, og vi viser fire klasser — «Moderat til lav» er én klasse hos NGU,
 * og skal ikke splittes i «middels» og «lav».
 */
export const RADON_LABEL: Record<string, string> = {
  særligHøy: "Særlig høy",
  høy: "Høy",
  moderatTilLav: "Moderat til lav",
  usikker: "Usikker",
};

export interface FactText {
  headline: string;
  details: string[];
  caveat: string | null;
  /** Kort form for kompakt visning. Samme påstand som headline, færre ord. */
  compact?: { headline: string; context: string };
  /** Kildens egne koder og klasser. Vises bare under «Detaljer». */
  technical?: string[];
}

export interface SourceInfo {
  name: string;
  owner: string;
  licenseName: string;
  licenseUrl: string;
  /** Etatens egen publiserte kartside, når den finnes, slik at svaret kan etterprøves der. */
  url?: string;
  /**
   * Det som gjelder hele datasettet: metode, definisjoner og hva kilden ikke oppgir. Står én gang
   * i «Kilder og metode», i stedet for på hvert kort eller i en seksjonsingress.
   */
  method?: string;
}

/** Kilde per provider/lookup. Vises alltid sammen med faktaene. */
export const SOURCES: Record<string, SourceInfo> = {
  "mdir-forurenset-grunn": {
    name: "Forurenset grunn",
    owner: "Miljødirektoratet",
    licenseName: "NLOD 2.0",
    licenseUrl: "https://data.norge.no/nlod/no/2.0",
    method:
      "Kilden oppgir ikke hvilken type forurensning som er registrert. En registrering gjelder lokaliteten i Miljødirektoratets database, ikke nødvendigvis hele eiendommen eller naboeiendommene.",
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
    method:
      "En kartlagt sone betyr at NVE har utredet forholdene på stedet. Klassifiseringen gjelder hele sonen, ikke den enkelte eiendom.",
  },
  "nve-kvikkleire-aktsomhet": {
    name: "Aktsomhetskart for kvikkleireskred",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    method:
      "Et aktsomhetsområde er et oversiktskart som sier at forholdene bør undersøkes nærmere — ikke at kvikkleire er påvist eller at noe vil skje.",
  },
  "nve-flom": {
    name: "Flomsoner og aktsomhetsområde for flom",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    method:
      "En kartlagt flomsone er beregnet av NVE for et bestemt vassdrag. Et aktsomhetsområde er et landsdekkende oversiktskart som sier at forholdene bør undersøkes nærmere.",
  },
  "nve-skred": {
    name: "Skredfaresoner og aktsomhetsområder for skred",
    owner: "NVE",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    method:
      "En kartlagt skredfaresone er en utredning på stedet. Et aktsomhetsområde er et landsdekkende oversiktskart, modellert fra terreng, som sier at forholdene bør undersøkes nærmere.",
  },
  "ngu-radon-aktsomhet": {
    name: "Radon – aktsomhetsområder",
    owner: "Norges geologiske undersøkelse og Direktoratet for strålevern og atomsikkerhet",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    // NGUs eget publikumskart. Klassen vi viser skal kunne slås opp her og stemme.
    url: "https://geo.ngu.no/kart/radon/",
  },
  "kartverket-stormflo": {
    name: "Stormflo og havnivå",
    owner: "Kartverket",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    // Kartverkets publikumskart. Svaret vårt er de samme kartlagene, og skal kunne slås opp der.
    url: "https://kartverket.no/til-sjos/se-havniva/kart",
    method:
      "Beregnet av Kartverket fra terrengmodell og vannstandsstatistikk, samme kartlag som «Se havnivå i kart». Viser hvilket areal som kan stå under vann ved et nivå, ikke hva som skjer med bygningen. Et punkt som ligger i sjøen etter Kartverkets kystlinje, får ingen stormflovurdering.",
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
  "udir-skoler": {
    name: "Grunnskoler og videregående skoler",
    owner: "Utdanningsdirektoratet",
    licenseName: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  "udir-barnehager": {
    name: "Barnehager",
    owner: "Utdanningsdirektoratet",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
  },
  "helsenorge-sykehus": {
    name: "Sykehus",
    owner: "Helsenorge og Enhetsregisteret",
    licenseName: "NLOD 2.0",
    licenseUrl: "https://data.norge.no/nlod/no/2.0",
  },
  omsorgstilbud: {
    name: "Omsorgstilbud",
    owner: "Oslo kommune og Helsenorge",
    licenseName: "NLOD 2.0",
    licenseUrl: "https://data.norge.no/nlod/no/2.0",
  },
  "oslo-skjenkebevilling": {
    name: "Skjenkebevillinger i Oslo",
    owner: "Næringsetaten, Oslo kommune",
    // Tjenesten oppgir ingen lisens. Vi sier det heller enn å anta.
    licenseName: "lisens ikke oppgitt",
    licenseUrl: "https://od2.pbe.oslo.kommune.no/xkart/skjenkebevilling/",
  },
  "mdir-stoy-strategisk": {
    name: "Strategisk støykartlegging",
    owner: "Miljødirektoratet",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    method:
      "Strategisk støykartlegging etter EU-støydirektivet, kartlagt 2022. Modellberegning for området, ikke måling ved boligen.",
  },
  "svv-stoysone-veg": {
    name: "Støyvarselkart for veg",
    owner: "Statens vegvesen",
    licenseName: "NLOD",
    licenseUrl: "https://data.norge.no/nlod/no/1.0",
    method:
      "Støysoner etter retningslinje T-1442. Statens vegvesen oppgir at støyvarselkartet ikke skal brukes til detaljvurdering av enkeltboliger.",
  },
  "avinor-stoysone-fly": {
    name: "Flystøysoner",
    owner: "Avinor",
    licenseName: "Åpne data",
    licenseUrl: "https://kartkatalog.geonorge.no/metadata/1489f7f8-40c8-4dc4-83b6-bcf277b56506",
    // Avinors eget støysonekart. Geonorge-tjenesten vi spør, gir samme sone (ADR 015).
    url: "https://experience.arcgis.com/experience/ed39c47ac2df499f8926b69866c0eadc",
    method:
      "Støysoner etter retningslinje T-1442, modellberegnet for lufthavnen, ikke målt ved boligen. Beregningsåret er året trafikkgrunnlaget gjelder, ofte et prognoseår — ikke når beregningen ble gjort. Dekker Avinors lufthavner; Forsvarets flyplasser (f.eks. Ørland) er ikke med.",
  },
};

/**
 * Forurenset grunn — Miljødirektoratets vurdering i klartekst.
 * Tallkoden («påvirkningsgrad 3») er teknisk og hører hjemme under «Detaljer».
 */
const PAAVIRKNINGSGRAD_SETNING: Record<string, string> = {
  liteForurensning: "Stedet er vurdert som lite eller ikke forurenset, uten behov for tiltak.",
  akseptabelForurensning: "Tilstanden er vurdert som akseptabel med dagens arealbruk.",
  ikkeAkseptabelForurensning: "Tilstanden er vurdert som ikke akseptabel, og det er behov for tiltak.",
  ukjentPåvirkning: "Det er mistanke om forurensning eller for lite informasjon, og oppfølgingen er uavklart.",
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

/**
 * NVE bruker 0 der spenningen ikke er registrert — 15 transformatorstasjoner og én
 * kraftledning nasjonalt. «0 kV» ville lest som en faktisk spenning, så feltet utelates.
 * Vi gjetter aldri på en verdi.
 */
function spenning(value: unknown): number | null {
  const kv = num(value);
  return kv !== null && kv > 0 ? kv : null;
}

/**
 * Anlegg i «Nærområdet». Ordlyden er bevisst nøytral: kilden er et tillatelsesregister,
 * ikke en vurdering av om anlegget er et problem. Ingen «forurensende», «farlig» eller «miljøfare».
 */
export const ANLEGG_TYPE_LABEL: Record<string, string> = {
  industrianlegg: "Anlegg med utslippstillatelse",
  avfallsanlegg: "Avfalls- eller gjenvinningsanlegg med utslippstillatelse",
};

/** Skoler og barnehager. Nøytrale typenavn — dette er steder som finnes, ikke forhold å vurdere. */
export const OPPVEKST_TYPE_LABEL: Record<string, string> = {
  grunnskole: "Grunnskole",
  videregaende_skole: "Videregående skole",
  barnehage: "Barnehage",
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

  // Ligger søkepunktet inne i lokaliteten, er det det viktigste kortet sier, og det står først.
  // Ligger det utenfor, sier avstanden ved navnet det samme («130 m unna»), og en egen linje ville
  // bare gjentatt den på hvert kort.
  if (contains) details.push("Søkepunktet ligger innenfor denne lokaliteten.");

  // Lokalitetstypen sier noe reelt når den ikke bare er «forurenset grunn» — deponi, skytebane, skipsverft.
  const type = str(a.lokalitetType);
  const typeSetning = type && type !== "forurensetGrunn" ? LOKALITET_TYPE_SETNING[type] : null;
  if (typeSetning) details.push(`Registrert som ${typeSetning}.`);

  const grad = str(a.paavirkningsgrad) ?? "";
  const prosess = str(a.prosessStatus) ?? "";
  // Grad X sier allerede at oppfølgingen er uavklart. Da skal ikke prosesstatusen gjenta det.
  const gjentar = grad === "ukjentPåvirkning" && prosess === "uavklart";
  const vurdering = [PAAVIRKNINGSGRAD_SETNING[grad], gjentar ? null : PROSESS_STATUS_SETNING[prosess]]
    .filter(Boolean)
    .join(" ");
  if (vurdering) details.push(vurdering);

  const tilstand = TILSTANDSKLASSE_TEXT[str(a.tilstandsklasse) ?? ""];
  if (tilstand) details.push(`Høyeste registrerte tilstandsklasse: ${tilstand}.`);

  // At kilden ikke oppgir stofftype, og at registreringen gjelder lokaliteten og ikke hele
  // eiendommen, gjelder hele datasettet. Det står én gang i «Kilder og metode» (SOURCES.method).

  const arealbruk = AREALBRUK_TEXT[str(a.arealbruk) ?? ""];
  const areal = num(a.arealM2);
  const aar = num(a.registrertAar);

  return {
    // Seksjonen heter «Forurenset grunn», så navnet alene er nok — og linjen under sier
    // hvor registreringen ligger i forhold til søkepunktet.
    headline: title,
    details,
    caveat: null,
    // Kildens koder oversatt. En kode vi ikke har oversettelse for, vises ikke rått.
    technical: [
      PAAVIRKNINGSGRAD_TEKNISK[str(a.paavirkningsgrad) ?? ""] ?? null,
      LOKALITET_TYPE_SETNING[str(a.lokalitetType) ?? ""] ? `Lokalitetstype: ${LOKALITET_TYPE_SETNING[str(a.lokalitetType)!]}` : null,
      PROSESS_STATUS_SETNING[str(a.prosessStatus) ?? ""] ? `Status: ${PROSESS_STATUS_SETNING[str(a.prosessStatus)!]!.replace(/\.$/, "").toLowerCase()}` : null,
      arealbruk ? `Arealbruk: ${arealbruk.charAt(0).toLowerCase()}${arealbruk.slice(1)}` : null,
      areal !== null && areal > 0 ? formatArea(areal) : null,
      aar ? `registrert ${aar}` : null,
      externalId ? `Lokalitet-ID: ${externalId}` : null,
    ].filter((line): line is string => line !== null),
  };
}

/** Kort variant av stabiliteten. Skillet mellom mulig, påvist og friskmeldt må bestå. */
const STABILITET_KORT: Record<string, string> = {
  paavist_lav_sikkerhet: "Kvikkleire påvist",
  paavist_ikke_vurdert: "Kvikkleire påvist",
  paavist_tilfredsstillende: "Kvikkleire påvist",
  mulig: "Mulig kvikkleire, ikke påvist",
  ikke_fare: "Utredet: ikke fare for områdeskred",
};

function kvikkleireSone(title: string, a: AreaAttributes, contains: boolean): FactText {
  const omradetype = a.omradetype === "utlopsomrade" ? "utløpsområde" : "løsneområde";
  const nøkkel = str(a.stabilitet) ?? "";

  // Standardvisningen: hva slags sone, og NVEs klassifisering. To korte linjer.
  const details: string[] = [];
  if (STABILITET_KORT[nøkkel]) details.push(STABILITET_KORT[nøkkel]!);

  const faregrad = FAREGRAD_TEXT[str(a.faregrad) ?? ""];
  const risiko = num(a.risikoklasse);
  const klassifisering = [
    faregrad && faregrad !== "ingen" ? `Faregrad ${faregrad}` : null,
    risiko !== null ? `risikoklasse ${risiko} av 5` : null,
  ].filter(Boolean);
  if (klassifisering.length > 0) details.push(klassifisering.join(" · "));

  // Det tekniske: sikkerhetsfaktor, undersøkelsesnivå, konsekvens, årstall og forbehold.
  const aar = num(a.vurdertAar);
  const undersokelse = UNDERSOKELSE_TEXT[str(a.undersokelse) ?? ""];
  const konsekvens = KONSEKVENS_TEXT[str(a.konsekvens) ?? ""];
  const technical = [
    STABILITET_TEXT[nøkkel] ?? null,
    undersokelse ? `Undersøkelsesnivå: ${undersokelse}` : null,
    konsekvens && konsekvens !== "ingen" ? `Konsekvens: ${konsekvens}` : null,
    `Områdetype: ${omradetype}`,
    aar ? `Vurdert ${aar}` : null,
    "Klassifiseringen gjelder hele sonen, ikke den enkelte eiendom. NVE oppgir at datasettet primært er ment for vurdering på kommuneplannivå.",
  ].filter((linje): linje is string => linje !== null);

  return {
    headline: `${contains ? "Søkepunktet ligger i kvikkleiresone" : "Kartlagt kvikkleiresone"} «${title}»`,
    details,
    technical,
    caveat: null,
  };
}

/**
 * Støyens ene forbehold. Står én gang, i oppsummeringen av støygruppen — ikke på hvert kort.
 */
export const STOY_FORBEHOLD = "Modellberegnet, ikke målt ved boligen";
const STOY_FORBEHOLD_VED_PUNKTET = `Ved søkepunktet · ${STOY_FORBEHOLD.charAt(0).toLowerCase()}${STOY_FORBEHOLD.slice(1)}`;

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
        headline: "Utredet av NVE: ikke fare for områdeskred",
        details: [],
        technical: num(a.vurdertAar) ? [`Vurdert ${num(a.vurdertAar)}`] : [],
        caveat: null,
      };

    /*
     * NATURFARE.
     *
     * Regelen som styrer all tekst under: kildens ord, ikke våre. «Aktsomhetsområde» er et
     * screeningkart som sier at forholdene bør undersøkes nærmere — ikke at noe kommer til å skje.
     * En kartlagt sone er en utredning på stedet, og sies tydeligere. Ingen av dem blir «høy fare»
     * eller «flomfarlig bolig» i vår tekst, og det finnes ingen samlet risikoscore.
     */
    case "flom_sone": {
      const ar = num(a.gjentaksintervallAr);
      const alle = str(a.alleIntervaller);
      const klima = str(a.klimaIntervaller);
      return {
        headline: ar !== null ? `Innenfor kartlagt flomsone (${ar}-årsflom)` : "Innenfor kartlagt flomsone",
        details: [
          ar !== null
            ? `En ${ar}-årsflom er en flom som statistisk inntreffer én gang per ${ar} år. Arealet er beregnet av NVE for dette vassdraget.`
            : "Arealet er beregnet av NVE for dette vassdraget.",
        ],
        compact: { headline: "Kartlagt flomsone", context: ar !== null ? `${ar}-årsflom` : "NVEs flomsonekart" },
        technical: [
          alle !== null ? `Gjentaksintervaller som dekker punktet: ${alle} år` : null,
          klima !== null ? `Med klimapåslag: ${klima} år` : null,
          "NVEs flomsonekart dekker utvalgte vassdrag, ikke alle vassdrag i landet",
        ].filter((line): line is string => line !== null),
        caveat: null,
      };
    }

    case "flom_utenfor_sone":
      return {
        headline: "Utenfor kartlagt flomsone",
        // Ikke «ingen flomfare»: kartet dekker de vassdragene NVE har kartlagt, ikke alt vann.
        details: ["Punktet ligger i et område NVE har flomsonekartlagt, men utenfor de beregnede sonene."],
        compact: { headline: "Utenfor kartlagt flomsone", context: "NVEs flomsonekart" },
        technical: [
          "Kartleggingen gjelder vassdraget som er analysert. Lokal overvannsflom, bekker og små vassdrag er ikke med",
        ],
        caveat: null,
      };

    case "flom_aktsomhet":
      return {
        headline: "Aktsomhetsområde for flom",
        details: ["Området kan bli berørt av flom. Aktsomhetskartet er en landsdekkende oversikt, ikke en beregning for stedet."],
        compact: { headline: "Aktsomhetsområde for flom", context: "landsdekkende oversiktskart" },
        technical: [
          "Modellert av NVE fra terrengmodell og vannkart",
          "Sier ikke hvor høyt vannet kan stå, og erstatter ikke en flomsoneberegning",
        ],
        caveat: null,
      };

    case "skred_faresone": {
      const ar = num(a.gjentaksintervallAr);
      const typer = str(a.skredtyper);
      return {
        headline: "Innenfor kartlagt skredfaresone",
        details: [
          [
            "NVE har utredet skredfare på stedet.",
            ar !== null ? `Sonen gjelder en årlig sannsynlighet på 1/${ar}.` : null,
            typer !== null ? `Skredtype: ${typer}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        ],
        compact: {
          headline: "Kartlagt skredfaresone",
          context: ar !== null ? `årlig sannsynlighet 1/${ar}` : "NVEs faresonekart",
        },
        technical: [
          "Faresonekart for skred i bratt terreng finnes bare for utvalgte, utredede områder",
          "Nivåene 1/100, 1/1000 og 1/5000 følger sikkerhetsklassene i byggteknisk forskrift",
        ],
        caveat: null,
      };
    }

    case "skred_jord_flom_aktsomhet":
      return {
        headline: "Aktsomhetsområde for jord- og flomskred",
        details: ["Området er modellert som potensielt utsatt. Det er ikke en utredning av forholdene på eiendommen."],
        compact: { headline: "Aktsomhetsområde for jord- og flomskred", context: "landsdekkende kartserie" },
        technical: [
          "Landsdekkende kartserie fra NVE, modellert fra terreng og løsmasser",
          "Brukes til å avgjøre om en nærmere vurdering er nødvendig ved tiltak",
        ],
        caveat: null,
      };

    case "skred_sno_stein_aktsomhet":
      return {
        headline: "Aktsomhetsområde for snø- og steinskred",
        details: ["NVE kartlegger de to skredtypene sammen. Området er modellert som potensielt utsatt."],
        compact: { headline: "Aktsomhetsområde for snø- og steinskred", context: "kartlagt samlet for begge typer" },
        technical: [
          "Snø- og steinskred vises i samme aktsomhetsområde hos NVE; kartet skiller dem ikke",
          "Modellert fra terreng, ikke utredet for den enkelte eiendom",
        ],
        caveat: null,
      };

    case "radon_aktsomhet": {
      const grad = str(a.aktsomhetsgrad);
      const label = grad !== null ? (RADON_LABEL[grad] ?? grad) : null;
      return {
        headline: label !== null ? `${label} radonaktsomhet i området` : "Radonaktsomhet i området",
        details: [
          // Dette er den viktigste setningen i hele naturfaredelen, og den er ikke valgfri. Den
          // sier begge deler NGU sier: kartet er aktsomhet for området, og bare måling gir nivået.
          "Aktsomhet for området, ikke en måling i boligen. Faktisk radonnivå kan bare fastslås ved måling.",
        ],
        compact: {
          headline: label !== null ? `${label} radonaktsomhet` : "Radonaktsomhet",
          context: "aktsomhet for området, ikke måling i boligen",
        },
        technical: [
          str(a.kildetekst) !== null ? `Kildens klasse: ${str(a.kildetekst)}` : null,
          "Nasjonalt aktsomhetskart for radon (NGU og DSA), modellert fra inneluftmålinger og geologi",
          "Alle boliger bør måle radon uavhengig av aktsomhetsgrad",
        ].filter((line): line is string => line !== null),
        caveat: null,
      };
    }

    case "stormflo": {
      const ar = num(a.gjentaksintervallAr);
      const fram = num(a.framtidigGjentaksintervallAr);
      const framAr = num(a.framtidigAr);
      return {
        headline:
          ar !== null
            ? `Kan bli berørt av stormflo (${ar}-årsnivå)`
            : "Kan bli berørt av stormflo ved framtidig havnivå",
        details: [
          ar !== null
            ? `Eiendommen ligger innenfor arealet Kartverket har beregnet for et ${ar}-årsnivå med dagens havnivå.`
            : fram !== null && framAr !== null
              ? `Eiendommen ligger innenfor arealet for et ${fram}-årsnivå med forventet havnivå i ${framAr}.`
              : "Eiendommen ligger innenfor et beregnet stormflonivå.",
          fram !== null && framAr !== null && ar !== null
            ? `Med forventet havnivå i ${framAr} gjelder det også et ${fram}-årsnivå.`
            : null,
        ].filter((line): line is string => line !== null),
        compact: {
          headline: "Kan bli berørt av stormflo",
          context: ar !== null ? `${ar}-årsnivå` : framAr !== null ? `framtidig havnivå ${framAr}` : "beregnet nivå",
        },
        technical: [
          "Beregnet av Kartverket ut fra terrengmodell og vannstandsstatistikk",
          "Viser hvilket areal som kan stå under vann ved nivået, ikke hva som skjer med bygningen",
        ],
        caveat: null,
      };
    }

    case "stormflo_utenfor":
      return {
        headline: "Ikke berørt av kartlagte stormflonivåer",
        details: ["Eiendommen ligger i et kartlagt kystområde, men utenfor arealene Kartverket har beregnet."],
        compact: { headline: "Utenfor kartlagt stormflonivå", context: "Kartverkets stormflokart" },
        technical: ["Gjelder nivåene vi viser: 20- og 200-årsnivå med dagens havnivå, og 200-årsnivå med havnivå i 2100"],
        caveat: null,
      };

    case "kvikkleire_aktsomhet":
      return {
        headline: "Aktsomhetsområde for kvikkleireskred",
        details: ["Området kan ha marin leire i skrånende terreng. Kvikkleire er ikke påvist."],
        // Det som forklarer hva kartet betyr og ikke betyr, står under «Detaljer».
        technical: [
          "Ved byggetiltak i et slikt område krever NVE at det innhentes geoteknisk vurdering",
          "Oversiktskart i målestokk 1:50 000",
          "Sier ikke noe om forholdene på den enkelte eiendom",
        ],
        caveat: null,
      };

    case "transformatorstasjon": {
      const kv = spenning(a.spenningKv);
      return {
        headline: `Transformatorstasjon «${title}»`,
        details: [[kv !== null ? `${kv} kV` : null, str(a.eier)].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: null,
      };
    }

    case "kraftledning": {
      const kv = spenning(a.spenningKv);
      const nett = str(a.nettnivaa) === "transmisjon" ? "transmisjonsnett" : "regionalnett";
      return {
        headline: `Kraftledning i ${nett}${title && title !== "Kraftledning" ? ` («${title}»)` : ""}`,
        details: [[kv !== null ? `${kv} kV` : null, str(a.eier)].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: "Jordkabler inngår ikke i NVEs åpne data.",
      };
    }

    case "hoyspent_distribusjon": {
      const kv = spenning(a.spenningKv);
      return {
        headline: "Høyspentledning i distribusjonsnettet",
        details: [[kv !== null ? `${kv} kV` : null, str(a.eier)].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: "Bare luftledninger NVE publiserer åpent. Jordkabler inngår ikke, og avstanden sier derfor ikke alt.",
      };
    }

    case "industrianlegg":
    case "avfallsanlegg": {
      const details = [`${ANLEGG_TYPE_LABEL[subtype] ?? "Anlegg med utslippstillatelse"}.`];
      const bransje = str(a.bransje);
      if (bransje) details.push(`Bransje: ${bransje}`);
      const utslipp = [a.utslippLuft === true ? "luft" : null, a.utslippVann === true ? "vann" : null].filter(Boolean);
      // Bare det kilden faktisk oppgir. Ingen utslipp registrert betyr ikke at anlegget slipper ut noe.
      if (utslipp.length > 0) details.push(`Rapporterer utslipp til ${utslipp.join(" og ")}.`);
      const aar = num(a.sisteRapporteringAar);
      if (aar) details.push(`Siste rapportering: ${aar}.`);
      return {
        headline: title,
        details,
        caveat: `Tillatelse gitt av ${str(a.myndighet) ?? "forurensningsmyndigheten"}. Posisjonen er ett punkt for anlegget, ikke tomtegrensen.`,
      };
    }

    case "grunnskole":
    case "videregaende_skole": {
      const details: string[] = [];
      const fra = num(a.lavesteTrinn);
      const til = num(a.hoyesteTrinn);
      const trinn = fra !== null && til !== null ? `${fra}.–${til}. trinn` : null;
      details.push([OPPVEKST_TYPE_LABEL[subtype], trinn].filter(Boolean).join(", ") + ".");
      const fakta = [
        num(a.antallElever) !== null ? `${num(a.antallElever)} elever` : null,
        str(a.eierforhold) ? `${str(a.eierforhold)!.toLowerCase()} skole` : null,
      ].filter(Boolean);
      if (fakta.length > 0) details.push(fakta.join(" · "));
      const adresse = [str(a.adresse), str(a.poststed)].filter(Boolean).join(", ");
      if (adresse) details.push(adresse);
      return {
        headline: title,
        details,
        caveat: "Elevtall og opplysninger er hentet fra Utdanningsdirektoratets register.",
      };
    }

    case "barnehage": {
      const details: string[] = [];
      const fra = num(a.lavesteAlder);
      const til = num(a.hoyesteAlder);
      const alder = fra !== null && til !== null ? `${fra}–${til} år` : null;
      details.push([OPPVEKST_TYPE_LABEL.barnehage, alder].filter(Boolean).join(", ") + ".");
      const fakta = [
        num(a.antallBarn) !== null ? `${num(a.antallBarn)} barn` : null,
        str(a.eierforhold) ? `${str(a.eierforhold)!.toLowerCase()} barnehage` : null,
      ].filter(Boolean);
      if (fakta.length > 0) details.push(fakta.join(" · "));
      return {
        headline: title,
        details,
        caveat: "Opplysningene er hentet fra Utdanningsdirektoratets register.",
      };
    }

    case "stoy_strategisk_veg":
    case "stoy_strategisk_bane": {
      const level = str(a.niva);
      const kilde = subtype === "stoy_strategisk_veg" ? "veitrafikk" : "bane (tog, T-bane eller trikk)";
      if (!level) return null;
      const kortKilde = subtype === "stoy_strategisk_veg" ? "veitrafikk" : "bane";
      return {
        // «Ved søkepunktet» står som avstand på kortet, og forbeholdet i gruppens oppsummering.
        // Metode og kartleggingsår står i «Kilder og metode».
        headline: `Beregnet støy fra ${kilde}: Lden ${level}`,
        details: [],
        caveat: null,
        compact: { headline: `Støy fra ${kortKilde} · Lden ${level}`, context: STOY_FORBEHOLD_VED_PUNKTET },
      };
    }

    case "stoysone_veg_t1442": {
      const sone = a.sone === "rod" ? "rød" : "gul";
      const aar = num(a.prognoseAar);
      return {
        headline: `${sone === "rød" ? "Rød" : "Gul"} støysone for veitrafikk (T-1442)`,
        details: [
          [str(a.kilde), aar ? `prognoseår ${aar}` : null].filter(Boolean).join(" · ") || "Statens vegvesens støyvarselkart.",
        ],
        caveat: null,
        compact: { headline: `${sone === "rød" ? "Rød" : "Gul"} støysone for veitrafikk`, context: STOY_FORBEHOLD_VED_PUNKTET },
      };
    }

    case "stoysone_fly_t1442": {
      const sone = a.sone === "rod" ? "rød" : "gul";
      const aar = num(a.beregnetAar);
      return {
        headline: `${sone === "rød" ? "Rød" : "Gul"} flystøysone (T-1442)`,
        // «Beregningsår» er SOSI-spesifikasjonens eget ord: året trafikkgrunnlaget gjelder, ikke når
        // beregningen ble gjort. Lufthavnen er navnet fra lib/facts/lufthavner.ts, aldri ICAO-koden.
        details: [[str(a.lufthavn), aar ? `beregningsår ${aar}` : null].filter(Boolean).join(" · ")].filter(Boolean),
        caveat: null,
        compact: { headline: `${sone === "rød" ? "Rød" : "Gul"} flystøysone`, context: STOY_FORBEHOLD_VED_PUNKTET },
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
  /** Sann når vi bare hentet de nærmeste. Da skal vi ikke påstå at dette er alle. */
  truncated?: boolean;
}): FactText {
  const parts = input.byGrade
    .filter((g) => g.count > 0)
    .map((g) => `${g.count} ${PAAVIRKNINGSGRAD_SHORT[g.grade] ?? "uten oppgitt grad"}`);
  return {
    headline: input.truncated
      ? `De ${input.total} nærmeste registrerte lokalitetene innen ${input.radiusLabel}`
      : `${input.total} registrerte lokaliteter innen ${input.radiusLabel}`,
    details: parts.length > 0 ? [`Fordeling etter Miljødirektoratets påvirkningsgrad: ${parts.join(", ")}.`] : [],
    caveat:
      "Databasen inneholder også registreringer fra bygge- og gravesaker, og er derfor tett i byer. Antallet sier ikke noe om forholdene på en enkelt eiendom.",
  };
}

/**
 * Vises når det finnes registreringer i området, men ingen av dem er vurdert til å kreve
 * oppfølging. Da er det ingen hovedkort, og brukeren skal få vite hvorfor.
 */
/**
 * Sammendraget på selve gruppen «Forurenset grunn», før den åpnes. Antall som krever
 * oppfølging telles på myndighetens grad — grad 1 og 2 er kildens egen konklusjon om at
 * tilstanden er akseptabel, og skal ikke telles som oppfølging selv om de vises.
 */
export function describeContaminatedGroupSummary(input: {
  oppfolging: number;
  total: number;
  radiusLabel: string;
}): string {
  const registreringer = `${input.total} ${input.total === 1 ? "registrering" : "registreringer"}`;
  if (input.oppfolging === 0) return `${registreringer} · ingen vurdert til å kreve tiltak eller oppfølging`;
  // Radiusen står i seksjonsingressen og i overskriften på siden. Å gjenta den her gjorde
  // linjen lang nok til å brekke på mobil, uten å si noe nytt.
  return `${input.oppfolging} krever oppfølging · ${registreringer} totalt`;
}

export const INGEN_FORURENSNING_TIL_OPPFOLGING =
  "Ingen av registreringene i området er vurdert til å kreve tiltak eller oppfølging.";

/**
 * Sammendraget på gruppen i den offentlige visningen, der bare relevante funn er med.
 *
 * Hver del sier hva kilden faktisk har registrert — behov for tiltak, uavklart mistanke eller
 * tiltak som pågår — i stedet for et samlet «krever oppfølging» som får alt til å høres likt ut.
 */
export function describeContaminatedRelevantSummary(input: {
  tiltak: number;
  uavklart: number;
  pagaende: number;
}): string {
  return [
    input.tiltak > 0 ? `${input.tiltak} med behov for tiltak` : null,
    input.uavklart > 0 ? `${input.uavklart} med uavklart mistanke` : null,
    input.pagaende > 0 ? `${input.pagaende} der tiltak pågår` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Oppsummeringen inne i «Se alle» i den offentlige visningen. Den skal ikke antyde at dette er
 * alle registreringene i databasen, og den sier hva som er utelatt.
 */
export function describeContaminatedRelevantOverview(input: { total: number; radiusLabel: string }): FactText {
  const lokaliteter = input.total === 1 ? "lokalitet" : "lokaliteter";
  return {
    headline: `${input.total} ${lokaliteter} med behov for tiltak, uavklart mistanke eller pågående tiltak innen ${input.radiusLabel}`,
    details: [],
    caveat:
      "Lokaliteter som Miljødirektoratet har vurdert som lite forurenset eller akseptable med dagens arealbruk, vises ikke. Registreringene gjelder lokaliteten, ikke nødvendigvis hele eiendommen eller naboeiendommene.",
  };
}

/** Én undertype i en gruppe, med antall: «7 barnehager». */
export interface ClusterCount {
  antall: number;
  ental: string;
  flertall: string;
}

/**
 * Kompakt oppsummering av en gruppe, f.eks. «2 skoler · 7 barnehager innen 1 km».
 * En type som ikke finnes i området nevnes ikke — vi skriver ikke «0 skoler».
 */
export function describeClusterSummary(deler: readonly ClusterCount[], radiusLabel: string): string {
  const tekst = deler
    .filter((del) => del.antall > 0)
    .map((del) => `${del.antall} ${del.antall === 1 ? del.ental : del.flertall}`);
  return `${tekst.join(" · ")} innen ${radiusLabel}`;
}

/**
 * Tekst på utvideren for resten av en liste. Når kilden har flere enn vi viser, sier vi det
 * rett ut i stedet for å love «alle».
 */
export function describeClusterToggle(input: { flertall: string; vist: number; total: number }): string {
  return input.total > input.vist
    ? `Se de ${input.vist} nærmeste av ${input.total}`
    : `Se alle ${input.flertall} (${input.total})`;
}

/**
 * Oppsummeringen på «Grunnforhold». Det som gjelder søkepunktet selv står først; en sone langt
 * unna skal ikke dominere seksjonen.
 */
/**
 * Oppsummeringen på «Naturfare».
 *
 * Rekkefølgen er rangeringen: kartlagte soner er utredninger på stedet og nevnes først,
 * aktsomhetsområder er oversiktskart og telles, radon står for seg fordi det er en annen slags
 * opplysning. Ingen samlet score, og ingen vurdering av hvor alvorlig summen er.
 */
export function describeGrunnforholdSummary(input: {
  aktsomhetVedPunkt: boolean;
  utredetVedPunkt: boolean;
  soneVedPunkt: boolean;
  soner: number;
  radiusLabel: string;
  /** Kartlagte soner ved punktet utover kvikkleire, med kildens ord: «flomsone», «skredfaresone». */
  kartlagteSoner?: string[];
  /** Antall aktsomhetsområder ved punktet utover kvikkleire. */
  aktsomhetsomrader?: number;
  /**
   * Hva aktsomhetsområdene gjelder, med kildens ord: «flom», «jord- og flomskred». Når den er
   * satt, navngis typene i stedet for bare å telles — «Aktsomhetsområde for flom» sier mer enn
   * «Aktsomhetsområde».
   */
  aktsomhetTyper?: string[];
  /**
   * Radonlinjen, gjenbrukt fra radonkortets egen kortform («Meget høy radonaktsomhet»).
   *
   * Sendes som ferdig tekst framfor som klasse, fordi AreaFact er visningsformen og ikke bærer
   * attributter. Da slipper vi å tolke kildeverdier på nytt her — all ordlyd står ett sted.
   */
  radonLinje?: string | null;
}): string {
  const andreSoner = input.kartlagteSoner ?? [];
  const aktsomhet = (input.aktsomhetVedPunkt ? 1 : 0) + (input.aktsomhetsomrader ?? 0);
  const radon = input.radonLinje?.trim() ? input.radonLinje.trim() : null;

  /*
   * Ordlyden for kvikkleire alene er bevart som den var. Telleformen brukes først når seksjonen
   * faktisk har flere forhold — «1 aktsomhetsområde» sier mindre enn «Aktsomhetsområde ved
   * søkepunktet», og kvikkleire-visningen fungerte godt før naturfare kom til.
   */
  const soneDel =
    input.soneVedPunkt && andreSoner.length === 0
      ? "Kvikkleiresone ved søkepunktet"
      : input.soneVedPunkt || andreSoner.length > 0
        ? `Kartlagt ${liste([...(input.soneVedPunkt ? ["kvikkleiresone"] : []), ...andreSoner])} ved søkepunktet`
        : null;

  const typer = input.aktsomhetTyper ?? [];
  const deler = [
    soneDel,
    typer.length === 1
      ? `Aktsomhetsområde for ${typer[0]} ved søkepunktet`
      : typer.length > 1
        ? `Aktsomhetsområder for ${liste(typer)} ved søkepunktet`
        : aktsomhet === 1
          ? "Aktsomhetsområde ved søkepunktet"
          : aktsomhet > 1
            ? `${aktsomhet} aktsomhetsområder ved søkepunktet`
            : null,
    input.utredetVedPunkt ? "Utredet: ikke fare for områdeskred ved søkepunktet" : null,
    radon !== null ? radon.charAt(0).toLowerCase() + radon.slice(1) : null,
    input.soner > 0
      ? `${input.soner} ${input.soner === 1 ? "kartlagt kvikkleiresone" : "kartlagte kvikkleiresoner"} innen ${input.radiusLabel}`
      : null,
  ].filter((del): del is string => del !== null);
  // Linjen står alene som første svar i seksjonen, så den begynner med stor bokstav også når
  // radon er det eneste funnet.
  const linje = deler.join(" · ");
  return linje.charAt(0).toUpperCase() + linje.slice(1);
}

/** «a», «a og b», «a, b og c». */
function liste(ord: string[]): string {
  if (ord.length <= 1) return ord[0] ?? "";
  return `${ord.slice(0, -1).join(", ")} og ${ord[ord.length - 1]}`;
}

/**
 * Oppsummeringen på «Infrastruktur»: hva som er der, med typens eget navn — «3
 * transformatorstasjoner», «2 transformatorstasjoner og 1 kraftlinje». En type uten navn telles
 * som «registrering», så summen alltid stemmer.
 */
export function describeInfrastrukturSummary(input: {
  total: number;
  radiusLabel: string;
  deler?: readonly { ental: string; flertall: string; antall: number }[];
}): string {
  const deler = (input.deler ?? []).filter((del) => del.antall > 0);
  const navngitt = deler.reduce((sum, del) => sum + del.antall, 0);
  const rest = input.total - navngitt;
  const ord = [
    ...deler.map((del) => `${del.antall} ${del.antall === 1 ? del.ental : del.flertall}`),
    ...(rest > 0 ? [`${rest} ${rest === 1 ? "registrering" : "registreringer"}`] : []),
  ];
  return `${liste(ord)} innen ${input.radiusLabel}`;
}

export const OPPVEKST_CAVEAT =
  "Fra Utdanningsdirektoratets registre. Familiebarnehager i private hjem og spesialskoler er ikke med.";

/**
 * Én nøytral etikett for alle omsorgs-, behandlings- og botilbud. Den presise typen —
 * sykehjem, rusbehandling, barnevern — lagres internt, men er aldri det brukeren ser.
 * NaboRadar viser hva som finnes; brukeren vurderer selv betydningen.
 */
export const OMSORG_LABEL = "Omsorgstilbud";

export const HELSE_CAVEAT =
  "Sykehus er somatiske sykehus som både Helsenorge og Enhetsregisteret fører som sykehus. Omsorgstilbud er steder der den ansvarlige myndigheten selv publiserer navn og adresse. Data om omsorgstilbud er foreløpig tilgjengelig i utvalgte områder, så listen er ikke uttømmende.";

/**
 * Skolekrets. Ordvalget er ikke pynt — det er hele funksjonen.
 *
 * Et inntaksområde er veiledende. Utdanningsetaten reviderer grensene hver høst, og
 * kapasitet kan gi plass ved en annen skole. Vi sier derfor «adressen ligger i», aldri
 * «din skole», «du sogner til» eller noe som kan leses som en garanti for skoleplass.
 */
/**
 * Offentlige tilfluktsrom.
 *
 * Tre ting ordlyden må holde. Kilden oppgir `plasser` — rommets dimensjonering, ikke ledige
 * plasser i dag — så vi skriver «dimensjonert for», aldri «ledige plasser» eller «her får du
 * plass». Avstanden er geografisk fra søkepunktet, ikke en anbefalt rute. Og et tilfluktsrom i
 * nærheten er ikke en anvisning om hvor noen skal gå; det er myndighetenes varsling som gjelder.
 *
 * Teksten skal være nøktern. Dette er referanseinformasjon, ikke et varsel.
 */
export const TILFLUKTSROM_LABEL = "Offentlig tilfluktsrom";

/** «Dimensjonert for 620 personer» — eller bare typen, når kilden ikke oppgir plasser. */
export function describeTilfluktsromLine(attributes: AreaAttributes): string {
  const plasser = num(attributes.plasser);
  return plasser !== null ? `Dimensjonert for ${plasser} personer` : TILFLUKTSROM_LABEL;
}

export function describeTilfluktsromSummary(input: { total: number; radiusLabel: string }): string {
  return input.total === 1
    ? `1 offentlig tilfluktsrom innen ${input.radiusLabel}`
    : `${input.total} offentlige tilfluktsrom innen ${input.radiusLabel}`;
}

export const TILFLUKTSROM_CAVEAT =
  "Avstanden er målt i luftlinje fra søkepunktet, ikke som anbefalt rute. Et offentlig tilfluktsrom " +
  "i nærheten er ikke i seg selv en anvisning om hvor du skal gå — følg råd og varsling fra " +
  "myndighetene. Antall plasser er rommets dimensjonering slik Sivilforsvaret oppgir den.";

export const SKOLEKRETS_LABEL = "Skolekrets";
export const SKOLEKRETS_UNDERTEKST = "Veiledende inntaksområde";

/** «Adressen ligger i det veiledende inntaksområdet til Nordberg skole.» */
export function describeSkolekrets(skoler: readonly string[], krets: string): string {
  if (skoler.length === 0) return `Adressen ligger i det veiledende inntaksområdet ${krets}.`;
  if (skoler.length === 1) return `Adressen ligger i det veiledende inntaksområdet til ${skoler[0]}.`;
  const alle = `${skoler.slice(0, -1).join(", ")} og ${skoler.at(-1)}`;
  return `Adressen ligger i et veiledende inntaksområde som deles av ${alle}.`;
}

export const SKOLEKRETS_FORBEHOLD =
  "Inntaksområdene kan endres og er ikke en garanti for skoleplass. Kapasitet kan gi tilbud ved en annen skole.";

/** Kun barnetrinnet. Ungdomsskole følger barneskolen, ikke en egen geografi. */
export const SKOLEKRETS_UNGDOMSTRINN =
  "Gjelder barnetrinnet. På ungdomstrinnet følger tilhørigheten hvilken barneskole eleven har nærskolerett ved.";

export const SERVERING_CAVEAT =
  "Fra Næringsetatens bevillingsoversikt, som foreløpig bare dekker Oslo. Tiden er tillatt stengetid — ikke skjenketid, og ikke stedets faktiske åpningstid, som kan være kortere.";

/**
 * Undertekst per sted i gruppene under «Nærområdet». Kort og etterprøvbar: type og det ene
 * kilden faktisk oppgir — trinn, aldersgruppe, eierform eller tillatt stengetid.
 */
export function describePlaceLine(input: { subtype: string; attributes: AreaAttributes }): string {
  const a = input.attributes;

  if (input.subtype === "omsorgstilbud") {
    // Én felles etikett. Den presise typen ligger i dataene, men vises ikke.
    return [OMSORG_LABEL, [str(a.adresse), str(a.poststed)].filter(Boolean).join(", ") || null]
      .filter(Boolean)
      .join(" · ");
  }

  if (input.subtype === "sykehus") {
    // «privat» er kildens eget flagg, og omfatter også ideelle sykehus som Diakonhjemmet.
    return str(a.eierform) === "privat" ? "Sykehus, privat drift" : "Sykehus";
  }

  if (input.subtype === "skjenkested") {
    const inne = str(a.stengetidInne);
    const ute = str(a.stengetidUte);
    if (!inne && !ute) return "Skjenkebevilling";
    return [
      inne ? `Tillatt stengetid inne ${inne}` : null,
      ute ? `ute ${ute}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const label = OPPVEKST_TYPE_LABEL[input.subtype] ?? "Skole eller barnehage";
  if (input.subtype === "barnehage") {
    const fra = num(a.lavesteAlder);
    const til = num(a.hoyesteAlder);
    return fra !== null && til !== null ? `${label}, ${fra}–${til} år` : label;
  }
  const fra = num(a.lavesteTrinn);
  const til = num(a.hoyesteTrinn);
  if (fra === null || til === null) return label;
  // Udir koder videregående som trinn 11–13. Det heter Vg1–Vg3 på norsk.
  if (input.subtype === "videregaende_skole") {
    return fra >= 11 && til <= 13 ? `${label}, Vg${fra - 10}–Vg${til - 10}` : label;
  }
  return `${label}, ${fra}.–${til}. trinn`;
}

/** Oppsummering for «Se alle anlegg i området». */
export function describeAnleggSummary(input: { total: number; radiusLabel: string }): FactText {
  return {
    headline: `${input.total} anlegg med utslippstillatelse innen ${input.radiusLabel}`,
    details: [],
    caveat:
      "Registeret omfatter virksomheter som har tillatelse etter forurensningsloven. Det sier ikke noe om hvor mye anlegget faktisk slipper ut.",
  };
}

/**
 * Korte linjer til kartpopup. Samme kilde til tekst som kortene, slik at kartet aldri
 * sier noe annet enn resten av siden.
 */
export function describeMapLines(input: { subtype: string; attributes: AreaAttributes }): string[] {
  const { subtype, attributes: a } = input;
  if (subtype === "forurenset_grunn") {
    const grad = PAAVIRKNINGSGRAD_SHORT[str(a.paavirkningsgrad) ?? ""];
    return ["Registrert lokalitet med forurenset grunn (Miljødirektoratet)", grad ? `Myndighetens vurdering: ${grad}` : null].filter(
      (line): line is string => line !== null,
    );
  }
  if (subtype in OPPVEKST_TYPE_LABEL) {
    const eier = str(a.eierforhold);
    return [`${OPPVEKST_TYPE_LABEL[subtype]} (Utdanningsdirektoratet)`, eier ? `${eier} eierforhold` : null].filter(
      (line): line is string => line !== null,
    );
  }
  if (subtype === "omsorgstilbud") {
    return [
      OMSORG_LABEL,
      [str(a.adresse), str(a.poststed)].filter(Boolean).join(", ") || null,
      str(a.kildeAktor) ? `Kilde: ${str(a.kildeAktor)}` : null,
    ].filter((line): line is string => line !== null);
  }
  if (subtype === "sykehus") {
    return [
      str(a.eierform) === "privat" ? "Sykehus, privat drift (Helsenorge)" : "Sykehus (Helsenorge)",
      [str(a.adresse), str(a.poststed)].filter(Boolean).join(", ") || null,
    ].filter((line): line is string => line !== null);
  }
  if (subtype === "offentlig_tilfluktsrom") {
    const plasser = num(a.plasser);
    return [
      `${TILFLUKTSROM_LABEL} (Sivilforsvaret)`,
      str(a.sted),
      plasser !== null ? `Dimensjonert for ${plasser} personer` : null,
    ].filter((line): line is string => line !== null);
  }
  if (subtype === "skjenkested") {
    const inne = str(a.stengetidInne);
    const ute = str(a.stengetidUte);
    return [
      "Sted med skjenkebevilling (Næringsetaten, Oslo kommune)",
      [str(a.adresse), str(a.poststed)].filter(Boolean).join(", ") || null,
      inne ? `Tillatt stengetid inne ${inne}${ute ? ` · ute ${ute}` : ""}` : null,
    ].filter((line): line is string => line !== null);
  }
  if (subtype === "industrianlegg" || subtype === "avfallsanlegg") {
    return [`${ANLEGG_TYPE_LABEL[subtype]} (Miljødirektoratet)`, str(a.bransje)].filter((line): line is string => line !== null);
  }
  return [];
}

/** Lenketekst per kildetype. */
export function linkLabelFor(sourceUrlType: string | null, providerId: string): string {
  if (sourceUrlType === "factsheet") return providerId === "mdir-forurenset-grunn" ? "Se faktaark hos Miljødirektoratet" : "Se faktaark";
  if (sourceUrlType === "report") return "Se rapport hos NVE";
  return "Se kilden";
}
