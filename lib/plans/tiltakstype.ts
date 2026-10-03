/**
 * Tiltakstype for en plansak: hva planarbeidet gjelder, ikke hvor i prosessen det er.
 *
 * Deterministisk ordliste, ingen AI. Kilden (DiBK) har ikke formål som felt, så typen leses av
 * det som faktisk står i tittelen og i formålssetningen fra planinitiativet eller planvarselet
 * (lib/plans/formaal.ts). Regelen er heller «annet» enn feil:
 *
 * - Tittelen veier tyngst. Den er satt av forslagsstiller og kommune, og er kort.
 * - Formålssetningen brukes bare fram til første «med tilhørende …», «samt …» eller komma-ledd,
 *   fordi resten lister følgetiltak (parkering, lekeplass, atkomst) som ikke er saken.
 * - Peker signalene på flere typer uten en regel som avgjør det, blir typen «annet».
 *
 * Reglene er målt mot ekte saker, se docs/research/planer-og-saker-v2.md.
 */
export const TILTAKSTYPER = [
  "bolig",
  "bolig_naering",
  "fritidsbolig",
  "naering",
  "industri",
  "datasenter",
  "masseuttak",
  "samferdsel",
  "skole_barnehage",
  "helse_omsorg",
  "hotell_servering",
  "idrett_park",
  "energi",
  "teknisk",
  "transformasjon",
  "annet",
] as const;

export type Tiltakstype = (typeof TILTAKSTYPER)[number];

/** Merkelappen på kortet. «Planarbeid» når typen er ukjent: det er alt vi vet. */
export const TILTAKSTYPE_LABELS: Record<Tiltakstype, string> = {
  bolig: "Boligprosjekt",
  bolig_naering: "Bolig og næring",
  fritidsbolig: "Hytter og fritidsboliger",
  naering: "Næring",
  industri: "Industri",
  datasenter: "Datasenter",
  masseuttak: "Masseuttak eller deponi",
  samferdsel: "Samferdsel",
  skole_barnehage: "Skole eller barnehage",
  helse_omsorg: "Helse og omsorg",
  hotell_servering: "Hotell og servering",
  idrett_park: "Idrett og park",
  energi: "Energianlegg",
  teknisk: "Teknisk infrastruktur",
  transformasjon: "Transformasjon eller riving",
  annet: "Planarbeid",
};

export function erTiltakstype(value: unknown): value is Tiltakstype {
  return typeof value === "string" && (TILTAKSTYPER as readonly string[]).includes(value);
}

/**
 * Ordlisten. Bokmål og nynorsk. `\b` virker ikke rundt æøå i JavaScript, så ordgrenser er
 * skrevet ut med G (start, slutt eller et tegn som ikke er en bokstav).
 */
const G = "(?:^|[^a-zæøå])";
const ord = (alternativer: string) => new RegExp(`${G}(?:${alternativer})`, "i");

type Signal = Exclude<Tiltakstype, "annet" | "bolig_naering">;

const REGLER: readonly [Signal, RegExp][] = [
  ["datasenter", ord("datasent|datahall|datalagring")],
  ["energi", ord("vindkraft|vindpark|solkraft|solpark|solcelle|kraftverk|batterilag|biogass|hydrogen|energipark|energianlegg")],
  [
    "masseuttak",
    ord("masseuttak|massetak|massesenter|pukkverk|steinbr[ou]dd|steinuttak|grustak|sandtak|massedeponi|deponi|masselager|masseh[aå]ndtering|uttak av (?:masser|stein|grus|l[øo]smasser|fjell)|r[åa]stoffutvinning"),
  ],
  ["fritidsbolig", ord("hytte|fritidsb[ou]|fritidsbebygg|fritidsbygg|fritidsomr[åa]de|fritidseiendom")],
  ["skole_barnehage", ord("skole|skule|barnehage|barnehave|oppvekstsenter|universitet|campus")],
  [
    "helse_omsorg",
    ord("sykehjem|sjukeheim|omsorgsb[ou]|omsorgssent|omsorgsplass|helsehus|helsetun|helsesent|sykehus|sjukehus|bofellesskap|bufellesskap|legevakt|legesent|d[øo]gnomsorg|institusjon|barnebolig|avlastningsbolig|akuttmedisin|ambulanse|rehabilitering"),
  ],
  ["hotell_servering", ord("hotel|overnatting|restaurant|servering|kafe|camping|reiseliv|turistanlegg|feriesenter|resort")],
  // Et vegnummer er bare saken når tittelen åpner med det («Fv.496 Sømsveien gs», «E6 Selli - Asp»).
  // «… gnr. 95 bnr. 1-4 m.fl. inkl. Fv 4494» er en stedsangivelse.
  ["samferdsel", /^.{0,12}?(?:^|[^a-zæøå])(?:(?:fv|rv|kv)\.? ?\d|e ?(?:6|8|10|12|14|16|18|39|45|69|75|105|134|136)(?=[^\d]|$))/i],
  [
    "samferdsel",
    ord(
      "fylkesve[gi]|riksve[gi]|europave[gi]|kryss(?:ingsspor|utbedring|l[øo]sning)?(?=$|[^a-zæøå])|rundkj[øo]ring|gang- og sykkel|g/s-?ve|gs-?ve[gi]|sykkelve[gi]|fortau|tunnel|omkj[øo]ring|ve[gi]anlegg|ve[gi]utbedring|trafikksikring|jernbane|planovergang|kryssingsspor|bybane|t-bane|trikk|bussdepot|bussterminal|kollektivterminal|kollektivfelt|holdeplass|kontrollstasjon|ferjekai|ferjeleie|flyplass|lufthavn|ny ve[gi]|ny bru|ny adkomst(?:ve[gi])?",
    ),
  ],
  [
    "teknisk",
    ord("renseanlegg|vannverk|vassverk|vannbehandling|avl[øo]p|vannforsyning|vassforsyning|h[øo]ydebasseng|pumpestasjon|flomsikring|flomvern|flomve[gi]|flomvoll|skredsikring|rassikring|skredvoll|gravplass|kirkeg[åa]rd|gravlund|brannstasjon|trafo|transformator|kraftl[ei]nje|nettstasjon|gjenvinning|milj[øo]stasjon|avfall|fjernvarme|milj[øo]park"),
  ],
  [
    "idrett_park",
    ord("idrett|stadion|idrettshall|flerbrukshall|sv[øo]mmehall|lekeplass|turve[gi]|tursti|skianlegg|alpin|golf|badeplass|friomr[åa]de|l[øo]ype|skytebane|skytearena|motorsport|aktivitetspark|bypark|folkepark|n[æe]rmilj[øo]anlegg|ridesent|klatrepark|adventurepark"),
  ],
  ["industri", ord("industri|fabrikk|verksted|produksjon|foredling|akvakultur|oppdrett|settefisk|smolt|slakteri|sagbruk|prosessanlegg|landbasert")],
  [
    "naering",
    ord("n[æe]ring|lager|logistikk|handel|detaljhandel|varehandel|kj[øo]pesent|butikk|dagligvare|forretning|kontor|havn(?:a|en|er|e-|eomr[åa]de|eanlegg)?(?=$|[^a-zæøå])|kai(?:a|en|anlegg)?(?=$|[^a-zæøå])|terminal|bensinstasjon|bilforretning|varehus"),
  ],
  [
    "bolig",
    ord("bolig|bustad|leilighet|leilegheit|rekkehus|tomannsb|eneb[ou]|sm[åa]hus|blokkbebyggelse|boenhet|bueining|hybel|hybl|studentb|bu?stadfelt|boligfelt|bofelt"),
  ],
  ["transformasjon", ord("transformasjon|riving|rive(?=$|[^a-zæøå])|sanering|byfornyelse|omdanning")],
];

/**
 * Gateadresser er ikke signaler. «Skoleveien 5» er ikke en skole og «Tornaas' vei 8» ikke et
 * veiprosjekt: et gatenavn fulgt av husnummer fjernes før ordlisten brukes.
 */
const GATEADRESSE =
  /[a-zæøå.'’-]*(?:ve[gi](?:en)?|gat[ae]n?|all[eé]en?|plass(?:en)?|bakken|stien|tunet|kroken|svingen|ringen|lia|åsen|haugen|løkka|faret|brygge)\s+\d+\s?[a-z]?(?:\s?[-–]\s?\d+)?(?=$|[^a-zæøå0-9])/gi;
/** Gatenavn i bestemt form uten husnummer: «Stadionvegen Øst». «Sykkelveg» og «turveg» er ubestemt og blir stående. */
const GATENAVN = /[a-zæøå]{3,}(?:vegen|veien|gata|gaten|alléen)(?=$|[^a-zæøå])/gi;

/**
 * Sisteledd i sammensatte ord: «Havnehotell», «ungdomsskole», «bydelssykehjem». Reglene over
 * krever at ordet starter med signalet; disse få gjelder også som siste ledd.
 */
const SISTELEDD: readonly [Signal, RegExp][] = [
  ["hotell_servering", /[a-zæøå]hotell(?:et)?(?=$|[^a-zæøå])/i],
  ["skole_barnehage", /[a-zæøå](?:skole|skule|barnehage)n?(?=$|[^a-zæøå])/i],
  ["helse_omsorg", /[a-zæøå](?:sykehjem|sjukeheim|sykehus|sjukehus|omsorgssenter|helsehus)(?:et)?(?=$|[^a-zæøå])/i],
  ["idrett_park", /[a-zæøå](?:idrettshall|svømmehall|flerbrukshall|idrettspark|idrettsanlegg)(?:en|et)?(?=$|[^a-zæøå])/i],
];

function signaler(tekst: string): Set<Signal> {
  const utenAdresser = tekst.replace(GATEADRESSE, " ").replace(GATENAVN, " ");
  const funnet = new Set<Signal>();
  for (const [type, mønster] of REGLER) if (mønster.test(utenAdresser)) funnet.add(type);
  for (const [type, mønster] of SISTELEDD) if (mønster.test(utenAdresser)) funnet.add(type);
  return funnet;
}

/** Leddet før følgetiltakene: «boliger med tilhørende parkering og lekeplass» → «boliger». */
function hovedledd(formål: string): string {
  const kutt = formål.search(/,| med tilhør| med tilh[øo]yr| samt | inkl| og tilhør| og tilh[øo]yr| slik at | for å | som (?:skal|vil|kan) /i);
  return kutt > 20 ? formål.slice(0, kutt) : formål;
}

/**
 * Når flere typer treffer. Rekkefølgen er den mest spesifikke først: et datasenter på et
 * industriområde er et datasenter, en skole med idrettshall er en skole.
 */
const SPESIFIKKE: readonly Signal[] = [
  "datasenter",
  "energi",
  "masseuttak",
  "skole_barnehage",
  "helse_omsorg",
  "fritidsbolig",
  "hotell_servering",
];

function avgjør(funn: Set<Signal>): Tiltakstype | null {
  if (funn.size === 0) return null;
  if (funn.size === 1) return [...funn][0]!;

  const spesifikke = SPESIFIKKE.filter((type) => funn.has(type));
  // «Jernbane og deponier»: deponiet følger anlegget, og vi vet ikke hva som er hovedsaken.
  if (funn.has("masseuttak") && funn.has("samferdsel")) return "annet";
  if (spesifikke.length === 1) return spesifikke[0]!;
  if (spesifikke.length > 1) return "annet";

  // Følgesignaler som ikke endrer hva saken er.
  const kjerne = new Set(funn);
  if (kjerne.size > 1) kjerne.delete("transformasjon");
  if (kjerne.size > 1 && (kjerne.has("bolig") || kjerne.has("naering") || kjerne.has("industri"))) {
    kjerne.delete("samferdsel");
    kjerne.delete("idrett_park");
    kjerne.delete("teknisk");
  }
  if (kjerne.size === 1) return [...kjerne][0]!;
  if (kjerne.size === 2 && kjerne.has("bolig") && kjerne.has("naering")) return "bolig_naering";
  if (kjerne.size === 2 && kjerne.has("industri") && kjerne.has("naering")) return "industri";
  return "annet";
}

export interface TiltakstypeResultat {
  type: Tiltakstype;
  /** Hvor typen kom fra. `null` når ingen signaler var sterke nok. */
  kilde: "tittel" | "formaal" | null;
}

/**
 * Tittelen først. Bare når den ikke sier noe, brukes formålssetningen. Sier de to ulike ting,
 * vinner tittelen: den er navnet kommunen og forslagsstiller har gitt saken. Ett unntak står i
 * koden.
 */
export function klassifiserTiltak(input: { title: string; formaal?: string | null }): TiltakstypeResultat {
  const fraTittel = avgjør(signaler(input.title));
  const fraFormål = input.formaal ? avgjør(signaler(hovedledd(input.formaal))) : null;

  // «Aunvågen næringsområde» der formålet er et datasenter: tittelen navngir området, formålet
  // tiltaket. Bare de to entydige typene får overstyre en generell tittel.
  if ((fraTittel === "naering" || fraTittel === "industri") && (fraFormål === "datasenter" || fraFormål === "masseuttak")) {
    return { type: fraFormål, kilde: "formaal" };
  }
  if (fraTittel && fraTittel !== "annet") return { type: fraTittel, kilde: "tittel" };
  if (fraFormål && fraFormål !== "annet") return { type: fraFormål, kilde: "formaal" };
  return { type: "annet", kilde: null };
}
