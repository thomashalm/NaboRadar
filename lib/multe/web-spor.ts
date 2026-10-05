import "server-only";

/**
 * Multe: web-spor. Internt researchlag i admin (Utforsk data). Aldri offentlig.
 *
 * Et web-spor er en OFFENTLIG ANEKDOTE: noen skrev på nettet at de fant multer ved et navngitt
 * sted et år. Det er ikke en artsregistrering, og det ligger derfor ikke sammen med
 * «Multe: registrerte funn» — verken i data, i kartet eller i panelet.
 *
 * SANNHETSKILDE: docs/research/multer-web-discovery.md (runde 1 og 2). Radene her er et utvalg
 * av sporene der: bare dem med navngitt sted. Endres researchen, endres denne filen for hånd.
 *
 * HVORFOR EN FIL OG IKKE EN TABELL: det er 16 rader som bare endres når noen gjør ny research.
 * En tabell ville krevd migrasjon, lese-RPC, tilgangsregler og en importvei for noe som i
 * praksis er et notat. Filen gir versjonshistorikk og kodegjennomgang gratis, og dataene kan
 * ikke lekke gjennom en database-RPC fordi de ikke finnes i databasen.
 *
 * GEOGRAFI: kildene navngir et tjern, en ås eller en myr — aldri et plantepunkt. Hvert spor er
 * derfor en sirkel rundt stedsnavnets punkt i Kartverkets register, og sirkelen er omtrentlig
 * med vilje. Ingen spor er «point»; typen finnes for den dagen en kilde faktisk oppgir et punkt.
 *
 * PERSONVERN: ingen navn, brukernavn, profiler eller kontaktopplysninger. Kildene står med
 * nettstedets navn og lenke til siden. Steder skribenter uttrykkelig holder hemmelige, er ikke
 * forsøkt plassert og er ikke med.
 */

export type WebsporSignal = "concrete_find" | "place_tip" | "season_observation" | "historical_reference";
export type WebsporGeotype = "point" | "approximate_area" | "broad_area";
/** Researchprioritet, ikke en sannhetsvurdering og ikke en sannsynlighet. */
export type WebsporKvalitet = "høy" | "middels" | "lav";
export type WebsporModenhet = "modne" | "delvis modne" | "umodne" | "ikke oppgitt";

export interface WebsporOmtale {
  /** Året observasjonen gjelder. Null når kilden ikke daterer den. */
  aar: number | null;
  /** ISO-dato når kilden oppgir dag. */
  dato: string | null;
  /** Det vi vet om tidspunktet når dagen mangler: «juli, ukjent år», «august 2023». */
  tidTekst?: string;
  signal: WebsporSignal;
  modenhet: WebsporModenhet | null;
  /** Kildens egen mengdebeskrivelse, kort. */
  mengde: string | null;
  /** Nettstedet, aldri en person. */
  kilde: string;
  kildeUrl: string;
  /** Én setning om hva kilden sier. Vår formulering, ikke et sitat. */
  sammendrag: string;
}

export interface Webspor {
  id: string;
  navn: string;
  /** Trakten sporet hører til. Spor i samme trakt deler `omrade`. */
  omrade: string;
  /** Kommune. */
  region: string;
  geotype: WebsporGeotype;
  /** [lengdegrad, breddegrad] for stedsnavnet. Sirkelens sentrum, ikke et funnsted. */
  senter: [number, number];
  radiusM: number;
  kvalitet: WebsporKvalitet;
  omtaler: WebsporOmtale[];
  /**
   * Uavhengige nettkilder for dette stedet, telt konservativt: samme skribent eller samme
   * nettsted over flere år er én kilde. Settes for hånd fra researchen, aldri høyere enn antall
   * ulike kilder i `omtaler`.
   */
  uavhengigeKilder: number;
  uavhengighetNotat?: string;
  /**
   * Mot våre egne data, regnet fra sirkelens sentrum da sporet ble lagt inn. Statisk: tallene
   * følger ikke med når funn- og myrlagene synkes på nytt.
   */
  fakta: { naermesteFunnM: number; funnInnen1Km: number; myrDekar1Km: number; beregnet: string };
  /** Plassen i den personlige shortlisten i researchen. Ikke en score. */
  anbefaltRang?: number;
  anbefaltNotat?: string;
  sistVerifisert: string;
  merknad?: string;
}

const VERIFISERT = "2026-10-05";
const fakta = (naermesteFunnM: number, funnInnen1Km: number, myrDekar1Km: number) => ({ naermesteFunnM, funnInnen1Km, myrDekar1Km, beregnet: VERIFISERT });

const BLOGG_HOLE = "Turblogg fra Hole (tur1.net)";
const BLOGG_ROMERIKE = "Turblogg fra Romeriksåsene (lapp-is.blogspot.com)";
const FORUM = "Kjentmannsmerkets forum";
const SKI_BILDE = "Skiforeningens Markadatabase, bildearkivet";
const SKI_STED = "Skiforeningens stedsbeskrivelser";

export const MULTE_WEBSPOR: readonly Webspor[] = [
  {
    id: "klekkenputten-tvetjerna",
    navn: "Klekkenputten–Tvetjerna",
    omrade: "Nordlige Krokskogen (Klekkenputten, Tvetjerna, Borgersetra, Vambu)",
    region: "Ringerike",
    geotype: "approximate_area",
    senter: [10.4339, 60.1537],
    radiusM: 1000,
    kvalitet: "høy",
    omtaler: [
      { aar: 2020, dato: "2020-07-18", signal: "concrete_find", modenhet: "umodne", mengde: null, kilde: BLOGG_HOLE, kildeUrl: "https://www.tur1.net/2020/07/18/tvetjerna-10-pa-topp-del-1-av-4-poster-pa-en-dag/", sammendrag: "Multer ved Tvetjerna (610 moh.), ikke modne ennå." },
      { aar: 2026, dato: "2026-07-23", signal: "concrete_find", modenhet: "umodne", mengde: "svært mye; omtalt som et multeår", kilde: FORUM, kildeUrl: "https://www.kjentmannsmerket.org/forum/postene-2026-2028/post-22-26-flyhavari-ved-klekkenputten/", sammendrag: "Svært mye multer langs skiløypetraseen mot Borgersetra, anslått modne om et par uker." },
      { aar: 2026, dato: "2026-08-21", signal: "concrete_find", modenhet: "ikke oppgitt", mengde: "fortsatt bær å finne", kilde: SKI_BILDE, kildeUrl: "https://www.skiforeningen.no/utimarka/markabilder/", sammendrag: "Offentlig bildetekst omtaler at det fortsatt var multer ved myrtjernet." },
    ],
    uavhengigeKilder: 2,
    uavhengighetNotat: "Bloggen fra 2020 er uavhengig av de to fra 2026. Bildet og foruminnlegget er fra samme sommer og kan være samme person, så de telles som én.",
    fakta: fakta(1106, 0, 252),
    anbefaltRang: 1,
    anbefaltNotat: "Flest spor, flere år, mye myr og ingen registrerte funn ved tjernet. Ingen har beskrevet mengden modne bær, og 2026 ble omtalt som et unntaksår.",
    sistVerifisert: VERIFISERT,
    merknad: "Sirkelen dekker Klekkenputten og Tvetjerna. Borgersetra ligger 1,3 km vest for sentrum.",
  },
  {
    id: "rudskampen-raabjorn",
    navn: "Rudskampen fra Råbjørn",
    omrade: "Romeriksåsene i Nannestad (Rudskampen, Elsjø)",
    region: "Nannestad",
    geotype: "approximate_area",
    senter: [10.8618, 60.2225],
    radiusM: 700,
    kvalitet: "høy",
    omtaler: [
      { aar: 2023, dato: "2023-08-01", signal: "concrete_find", modenhet: "modne", mengde: "spiseklare på myra før toppen; andre myrer i åsene trengte mer tid", kilde: FORUM, kildeUrl: "https://www.kjentmannsmerket.org/forum/postene-2022-24/multefest-pa-rudskampen-20-39/", sammendrag: "Modne multer på myrene langs blåstien fra Råbjørn, særlig myra som krysses før Rudskampen." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(2103, 0, 170),
    anbefaltRang: 2,
    anbefaltNotat: "Det mest presise sporet: hvilken myr og hvilken sti. Én kilde, ett år.",
    sistVerifisert: VERIFISERT,
    merknad: "Naturreservat. Sjekk verneforskriften før plukking.",
  },
  {
    id: "haklokroktjern",
    navn: "Haklokroktjern",
    omrade: "Hakkloa (Haklokroktjern, Haklomana)",
    region: "Oslo",
    geotype: "approximate_area",
    senter: [10.6603, 60.0962],
    radiusM: 600,
    kvalitet: "middels",
    omtaler: [
      { aar: 2022, dato: "2022-08-05", signal: "concrete_find", modenhet: "ikke oppgitt", mengde: "«masse multer»", kilde: FORUM, kildeUrl: "https://www.kjentmannsmerket.org/forum/postene-2020-2023/post-20-26-hakklokroktjern/paged/2/", sammendrag: "Mye multer langs en våt, lite brukt sti inn til tjernet." },
    ],
    uavhengigeKilder: 1,
    uavhengighetNotat: "Trakten rundt Hakkloa har trolig to uavhengige kilder: denne, og stedstipset om Haklomana–Helgeren fra 2012. De ligger 2,3 km fra hverandre og står som to spor.",
    fakta: fakta(4739, 0, 49),
    anbefaltRang: 3,
    anbefaltNotat: "Lengst fra alle registrerte funn. Lite myr i kartet, og kilden sier ikke hvor langs stien.",
    sistVerifisert: VERIFISERT,
  },
  {
    id: "haklomana-helgeren",
    navn: "Haklomana–Helgeren",
    omrade: "Hakkloa (Haklokroktjern, Haklomana)",
    region: "Oslo",
    geotype: "broad_area",
    senter: [10.701, 60.0822],
    radiusM: 1200,
    kvalitet: "lav",
    omtaler: [
      { aar: 2012, dato: null, tidTekst: "2012", signal: "place_tip", modenhet: null, mengde: null, kilde: "Kjentmannsmerket, artikkel", kildeUrl: "https://www.kjentmannsmerket.org/2012/11/6775/", sammendrag: "Artikkelen beskriver lyng og myr mellom Haklomana og Helgeren med blåbær og multer i sesongen." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(1991, 0, 22),
    anbefaltRang: 3,
    anbefaltNotat: "Hører til samme kandidat som Haklokroktjern. Stedstips, ikke et rapportert funn.",
    sistVerifisert: VERIFISERT,
  },
  {
    id: "atjern-langbru",
    navn: "Atjern og Langbru",
    omrade: "Krokskogen: Atjern, Storflåtan, Blekksjøflaga",
    region: "Ringerike",
    geotype: "approximate_area",
    senter: [10.441, 60.104],
    radiusM: 600,
    kvalitet: "høy",
    omtaler: [
      { aar: 2020, dato: "2020-07-22", signal: "concrete_find", modenhet: "delvis modne", mengde: "litt modne ved Atjern; modne på myra ved Langbru", kilde: BLOGG_HOLE, kildeUrl: "https://www.tur1.net/2020/07/29/del-3-storflatan-til-gyrihaugtjerna/", sammendrag: "Litt modne multer midt i løypetraseen ved Atjern, og modne bær på myra ved Langbru like sør for tjernet." },
    ],
    uavhengigeKilder: 1,
    uavhengighetNotat: "Trakten Atjern–Storflåtan–Blekksjøflaga har to uavhengige kilder: bloggen (2020 og 2021) og en bok gjengitt i en artikkel.",
    fakta: fakta(697, 5, 353),
    anbefaltRang: 4,
    anbefaltNotat: "Nettspor og artsdata sier det samme. Tryggest, minst nytt.",
    sistVerifisert: VERIFISERT,
    merknad: "Langbru er hyttetunet ved Gråbergtjern, 350 m sør for Atjern. Runde 1 plasserte det feil i Hole.",
  },
  {
    id: "storflaatan",
    navn: "Storflåtan",
    omrade: "Krokskogen: Atjern, Storflåtan, Blekksjøflaga",
    region: "Ringerike",
    geotype: "approximate_area",
    senter: [10.4652, 60.1227],
    radiusM: 800,
    kvalitet: "middels",
    omtaler: [
      { aar: 2021, dato: "2021-07-28", signal: "concrete_find", modenhet: "modne", mengde: null, kilde: BLOGG_HOLE, kildeUrl: "https://www.tur1.net/2021/07/28/storflatadammen-og-helleramshula-10-pa-topp-turer/", sammendrag: "Fin, moden multe i skiløypa ved Storflåtan." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(1563, 0, 56),
    anbefaltRang: 4,
    sistVerifisert: VERIFISERT,
  },
  {
    id: "blekksjoflaga",
    navn: "Blekksjøflaga",
    omrade: "Krokskogen: Atjern, Storflåtan, Blekksjøflaga",
    region: "Ringerike",
    geotype: "broad_area",
    senter: [10.5123, 60.1285],
    radiusM: 800,
    kvalitet: "lav",
    omtaler: [
      { aar: null, dato: null, tidTekst: "historisk, udatert", signal: "historical_reference", modenhet: null, mengde: "store forekomster, særlig etter snauhogst", kilde: "Kjentmannsmerket, artikkel som gjengir boka «Nordmarksliv»", kildeUrl: "https://www.kjentmannsmerket.org/2023/11/pa-sporet-av-en-tapt-kjentmannspost/", sammendrag: "En bok fra Storflåtan forteller om store multeforekomster på Bleiksjøflaka, særlig på hogstflater." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(2122, 0, 110),
    anbefaltRang: 4,
    anbefaltNotat: "Historisk. Tipset gjaldt hogstflater for lenge siden.",
    sistVerifisert: VERIFISERT,
    merknad: "Kilden skriver «Bleiksjøflaka»; stedsnavnregisteret har Blekksjøflaga.",
  },
  {
    id: "bislingflaka-aalsjobrenna",
    navn: "Bislingflaka–Ålsjøbrenna",
    omrade: "Nordlige Nordmarka over 600 m (Bislingen, Puttmyrene)",
    region: "Lunner",
    geotype: "broad_area",
    senter: [10.603, 60.2285],
    radiusM: 1500,
    kvalitet: "middels",
    omtaler: [
      { aar: 2023, dato: null, tidTekst: "august 2023", signal: "concrete_find", modenhet: "delvis modne", mengde: "mest kart, men mye modne et par steder", kilde: BLOGG_ROMERIKE, kildeUrl: "https://lapp-is.blogspot.com/search?q=molter", sammendrag: "Mest umodne bær på flakene, men enkelte steder mye modne." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(275, 6, 142),
    anbefaltRang: 5,
    anbefaltNotat: "Høyest, senest sesong, og registrerte funn like ved.",
    sistVerifisert: VERIFISERT,
    merknad: "Sentrum er Bislingflaka. Ålsjøbrenna ligger 1,8 km vest. Lenken går til bloggens søk; innlegget er fra august 2023.",
  },
  {
    id: "jordmyrane",
    navn: "Jordmyrane",
    omrade: "Romeriksåsene i Gjerdrum",
    region: "Gjerdrum",
    geotype: "approximate_area",
    senter: [10.9763, 60.0548],
    radiusM: 700,
    kvalitet: "middels",
    omtaler: [
      { aar: null, dato: null, tidTekst: "udatert", signal: "place_tip", modenhet: null, mengde: "«kan være bra med multer» et stykke ut på sommeren", kilde: SKI_STED, kildeUrl: "https://www.skiforeningen.no/sok/?q=Jordmyrane", sammendrag: "Redaksjonell stedsbeskrivelse av en stor myr der det kan være bra med multer utpå sommeren." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(1147, 0, 337),
    anbefaltRang: 6,
    anbefaltNotat: "Størst myr på listen, lavt (310 moh.) og tidlig. Generelt stedstips uten år.",
    sistVerifisert: VERIFISERT,
  },
  {
    id: "store-elsjo",
    navn: "Store Elsjø–Elsjøkongen",
    omrade: "Romeriksåsene i Nannestad (Rudskampen, Elsjø)",
    region: "Nannestad",
    geotype: "approximate_area",
    senter: [10.85, 60.1845],
    radiusM: 600,
    kvalitet: "middels",
    omtaler: [
      { aar: 2024, dato: "2024-07-26", signal: "concrete_find", modenhet: "delvis modne", mengde: "noen få, store", kilde: FORUM, kildeUrl: "https://www.kjentmannsmerket.org/forum/postene-2022-24/post-22-41-elsjokongen/paged/3/", sammendrag: "Noen få, store multer over en liten høyde nord for Store Elsjø; enkelte modne." },
    ],
    uavhengigeKilder: 1,
    uavhengighetNotat: "Romeriksåsene i Nannestad har to uavhengige bidragsytere i samme forum: denne og Rudskampen, 4 km unna.",
    fakta: fakta(459, 1, 96),
    anbefaltRang: 7,
    anbefaltNotat: "Kan tas på samme tur som Rudskampen. Liten mengde.",
    sistVerifisert: VERIFISERT,
  },
  {
    id: "puttmyrene-svarttjernshogda",
    navn: "Puttmyrene på Svarttjernshøgda",
    omrade: "Nordlige Nordmarka over 600 m (Bislingen, Puttmyrene)",
    region: "Jevnaker",
    geotype: "approximate_area",
    senter: [10.5101, 60.2296],
    radiusM: 600,
    kvalitet: "middels",
    omtaler: [
      { aar: null, dato: null, tidTekst: "ukjent år", signal: "concrete_find", modenhet: "modne", mengde: "ikke mange", kilde: SKI_BILDE, kildeUrl: "https://www.skiforeningen.no/utimarka/omrader/nordmarka-nord/steder/puttmyrene/", sammendrag: "Offentlig bildetekst: multene var modne, men det var ikke mange av dem." },
    ],
    uavhengigeKilder: 1,
    uavhengighetNotat: "Som bredt område har nordlige Nordmarka over 600 m tre uavhengige kilder, men ingen av de andre navngir denne myra.",
    fakta: fakta(938, 1, 177),
    anbefaltRang: 8,
    anbefaltNotat: "Udatert og lang tur. To uavhengige spor om myrene over 600 m i trakten.",
    sistVerifisert: VERIFISERT,
    merknad: "Fire myrer i området heter Puttmyrene. Skiforeningens stedsside beskriver den på Svarttjernshøgda, og den er brukt.",
  },
  {
    id: "lille-hvitsteinvann",
    navn: "Lille Hvitsteinvann",
    omrade: "Bærumsmarka og Krokskogen sør",
    region: "Oslo",
    geotype: "approximate_area",
    senter: [10.5297, 60.0005],
    radiusM: 500,
    kvalitet: "høy",
    omtaler: [
      { aar: null, dato: null, tidTekst: "juli, ukjent år", signal: "concrete_find", modenhet: "ikke oppgitt", mengde: "bra med bær på myrene ved vannet", kilde: SKI_BILDE, kildeUrl: "https://www.skiforeningen.no/utimarka/markabilder/", sammendrag: "Offentlig bildetekst omtaler plukking på myrene ved vannet; de første modner vanligvis midt i juli." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(844, 2, 185),
    anbefaltRang: 9,
    anbefaltNotat: "Nærmest byen og tidligst. Også det mest besøkte stedet på listen.",
    sistVerifisert: VERIFISERT,
  },
  {
    id: "lille-gyrihaugtjern",
    navn: "Lille Gyrihaugtjern",
    omrade: "Krokskogen: Gyrihaugen",
    region: "Ringerike",
    geotype: "approximate_area",
    senter: [10.3821, 60.0902],
    radiusM: 500,
    kvalitet: "middels",
    omtaler: [
      { aar: null, dato: null, tidTekst: "udatert", signal: "place_tip", modenhet: null, mengde: "«kan være rike på multer» i slutten av juli", kilde: SKI_STED, kildeUrl: "https://www.skiforeningen.no/sok/?q=Gyrihaugtjern", sammendrag: "Redaksjonell stedsbeskrivelse: myrområdet rundt tjernet kan være rikt på multer i slutten av juli." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(1670, 0, 12),
    anbefaltRang: 10,
    anbefaltNotat: "Redaksjonelt tips med tidspunkt. Nesten ikke myr i kartet, og mye folk.",
    sistVerifisert: VERIFISERT,
    merknad: "Lille Gyrihaugtjern står ikke i stedsnavnregisteret. Punktet er Gyrihaugtjern, rett sør for Gyrihaugen.",
  },
  {
    id: "kleivstua-kongens-utsikt",
    navn: "Kleivstua–Kongens utsikt",
    omrade: "Krokskogen vest (Hole)",
    region: "Hole",
    geotype: "approximate_area",
    senter: [10.314, 60.0455],
    radiusM: 800,
    kvalitet: "høy",
    omtaler: [
      { aar: 2021, dato: "2021-07-16", signal: "concrete_find", modenhet: "modne", mengde: "nok til dessert og litt syltetøy", kilde: BLOGG_HOLE, kildeUrl: "https://www.tur1.net/2021/07/16/rekordtidlige-multer/", sammendrag: "«Litt tidlig, men mye modent» et stykke fra Kleivstua, ved Åboråsbekken." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(514, 2, 39),
    sistVerifisert: VERIFISERT,
    merknad: "Sirkelen dekker Kleivstua, Kongens utsikt og Åboråsbekken. Kilden sier ikke hvor mellom dem.",
  },
  {
    id: "retthelltjernet-bureheim",
    navn: "Retthelltjernet–Bureheim",
    omrade: "Krokskogen vest (Hole)",
    region: "Hole",
    geotype: "broad_area",
    senter: [10.3393, 60.0452],
    radiusM: 1300,
    kvalitet: "middels",
    omtaler: [
      { aar: 2020, dato: "2020-07-24", signal: "concrete_find", modenhet: "ikke oppgitt", mengde: "litt bær, «ikke mye»", kilde: BLOGG_HOLE, kildeUrl: "https://www.tur1.net/2020/07/24/trim-og-jakt-pa-multer/", sammendrag: "Litt multer på turen fra Retthelltjernet mot Bureheim, men ikke mye." },
      { aar: 2025, dato: null, tidTekst: "sommeren 2025", signal: "concrete_find", modenhet: "ikke oppgitt", mengde: null, kilde: BLOGG_HOLE, kildeUrl: "https://www.tur1.net/2025/09/23/stolpejakt-ekspedisjon-sundvollen-krokskogen/", sammendrag: "Fant multer ved Retthella på en stolpejaktrunde. Ingen mengde oppgitt." },
    ],
    uavhengigeKilder: 1,
    uavhengighetNotat: "Begge omtalene er fra samme blogg. Det er én kilde, to år.",
    fakta: fakta(1829, 0, 95),
    sistVerifisert: VERIFISERT,
  },
  {
    id: "londalstjernet",
    navn: "Løndalstjernet",
    omrade: "Nordmarka nord (Lunner)",
    region: "Lunner",
    geotype: "approximate_area",
    senter: [10.6294, 60.1923],
    radiusM: 500,
    kvalitet: "middels",
    omtaler: [
      { aar: 2025, dato: "2025-07-30", signal: "concrete_find", modenhet: "ikke oppgitt", mengde: "en neve; «lite av dem»", kilde: FORUM, kildeUrl: "https://www.kjentmannsmerket.org/forum/postene-2024-2026-27/post-24-25-kolabonn-ved-londalstjern/", sammendrag: "En neve multer ved myra nær tjernet. Lite bær." },
    ],
    uavhengigeKilder: 1,
    fakta: fakta(4084, 0, 30),
    sistVerifisert: VERIFISERT,
  },
];
