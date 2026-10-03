/**
 * Formålssetningen i en plansak, hentet ordrett fra dokumentene forslagsstiller har sendt inn.
 *
 * Deterministisk: faste tekstmønstre, ingen AI og ingen omskriving. Resultatet er et sitat. Finner
 * vi ikke en ren setning, finnes det ikke noe formål, og visningen faller tilbake på sakstittelen.
 *
 * Målt på 74 ekte saker (docs/research/planer-og-saker-v2.md): en formålssetning finnes i rundt tre
 * av fire saker, men ikke alle er rene. Feilene som ble funnet er grunnen til filtrene under:
 *
 * - setninger kuttet ved en forkortelse («å legge til rette for utbygging av ca»),
 * - setninger som ikke sier noe («i tråd med overordnet plan»),
 * - tekstlag der ligaturer mangler («legge l re e for»),
 * - referattekst som handler om noe annet («… og at dette bør nevnes»).
 *
 * TALL VISES IKKE. Antall boliger, etasjer, areal, høyder og parkeringsplasser i fri tekst var feil i
 * om lag hver tredje forekomst (parkeringsnormer, delfelt, naboområder). Mengdeangivelser i sitatet
 * erstattes derfor med «[…]», den vanlige markeringen for utelatt tekst i et sitat.
 */

/** Dokumenttypene formålet kan hentes fra, i prioritert rekkefølge. */
export const FORMAAL_DOKUMENTTYPER = ["Planinitiativ", "Planvarsel", "ref-data-as-pdf", "ReferatOppstartsmoete"] as const;
export type FormaalDokumenttype = (typeof FORMAAL_DOKUMENTTYPER)[number];

export const FORMAAL_MAKS_TEGN = 300;
const MIN_TEGN = 25;

const SUBJEKT =
  "(?:plan(?:arbeidet|en|forslaget|initiativet|endringen|endringa)|reguleringen|reguleringa|reguleringsplanen|reguleringsendringen|reguleringsendringa|detaljreguleringen|detaljreguleringa|områdereguleringen|tiltaket|planarbeid|endring(?:en|a)?(?: av [^.:]{0,50})?)";

/**
 * Setningsmønstrene i prioritert rekkefølge. Gruppe 1 er sitatet.
 *
 * Alle krever en eksplisitt formulering om formål eller hensikt. Et mønster som bare leter etter
 * «legge til rette for» et sted i teksten, traff referatsetninger om helt andre ting.
 */
const MØNSTRE: readonly RegExp[] = [
  // «Formålet med planarbeidet er å legge til rette for …»
  new RegExp(
    `(?:Formålet|Formål|Hensikten|Hensikt|Føremålet|Hensikta|Formålet/hensikten|Hovedhensikten|Hovedformålet) med (?:denne |dette |denne plan)?${SUBJEKT}[^.:]{0,40}? (?:er|var|vil være|blir) (å [^.]{15,600})\\.`,
    "i",
  ),
  // «Planarbeidets formål er …», «Planarbeidet har til hensikt å …»
  new RegExp(`(?:Planarbeidets|Planens|Planforslagets|Endringens) (?:formål|hensikt|føremål) er ((?:å )?[^.]{15,600})\\.`, "i"),
  new RegExp(
    `(?:Planarbeidet|Planen|Planforslaget|Planinitiativet|Reguleringsplanen) har (?:som|til) (?:formål|hensikt|føremål) (å [^.]{15,600})\\.`,
    "i",
  ),
  // «Planarbeidet skal legge til rette for …»
  new RegExp(
    `(?:Planarbeidet|Planen|Planforslaget|Planinitiativet|Reguleringsplanen|Reguleringsendringen|Detaljreguleringen) (?:skal|vil) ((?:legge|leggja|leggje) til rette for [^.]{10,600}|tilrettelegge for [^.]{10,600})\\.`,
    "i",
  ),
];

/**
 * Varselskjemaet fra Fellestjenester Plan har et fast felt, «Hensikten med planarbeidet», fulgt av
 * feltet om konsekvensutredning. Det er det nærmeste kilden kommer et strukturert formål.
 */
const SKJEMAFELT = /Hensikten med planarbeidet\s+(.{10,1500}?)\s+(?:Konsekvensutredning\s+)?Krav til konsekvensutredning/i;

/** Feltet er fylt ut, men sier ikke hva saken gjelder. */
const FELT_UTEN_INNHOLD =
  /^(?:se |sjå |jf\.? |vedlagt|vises til|viser til|i henhold til|iht\.?|i samsvar med|i medhold av|med hjemmel i|det (?:varsles|gjøres oppmerksom|kunngjøres)|nb[: ]|obs[: ]|varsel om|kunngjøring|dette er (?:et )?varsel)/i;

/** En setning som slutter på en av disse er kuttet midt i, ikke avsluttet. */
const FORKORTELSE = /(?:^|[\s(/])(?:ca|pkt|gnr|bnr|g\.?nr|b\.?nr|gbnr|gnr\/bnr|jf|jfr|tidl|mfl|m\.fl|m|nr|evt|bl\.a|f\.eks|dvs|ev|inkl|kap|kl|mv|m\.m|osv|hhv|iht|ift|fv|rv|kv|ref|vedr|v|st|dr|red|maks|min|tlf|et|etg|prop|meld|pbl|avd|bygn|komm|reg|adv|dir|ing|fred|chr|joh|th|kr|[A-ZÆØÅ])$/i;

/** Setninger som ikke sier hva saken gjelder. */
const INNHOLDSLØS = /^å (?:være )?i tråd med|^å (?:følge|oppfylle|ivareta) |^å (?:avklare|vurdere|diskutere|drøfte|informere)\b|bør nevnes|se (?:mer )?(?:pkt|punkt|kap)|Saksnavn|Dato for|Side \d+ av/i;

/**
 * Mengder: et tall (eller tallord) foran en enhet eller et substantiv («10 eiendommer»,
 * «12 tilrettelagte boliger», «5300 m³», «3 etasjer»). Tall som er navn eller referanser blir
 * stående: gnr/bnr, husnummer («Karrestadveien 63»), vegnummer («Fv42»), årstall og paragrafer.
 */
const TALL = "(?<![\\d/§.\\u2024A-Za-zÆØÅæøå])\\d+(?:[ \\u00a0.\\u2024]\\d{3})*(?:[,.\\u2024]\\d+)?";
const ENHETSTEGN = "%|m[23²³]|kvm|daa|MW[A-Za-z]*|GWh|kWh|kV|BRA|BTA|BYA|etg|et";
const FORAN = "(?:ca[.\\u2024]?|cirka|omtrent|om lag|rundt|inntil|opptil|opp til|maks[.\\u2024]?|maksimalt|minst|minimum|totalt|til sammen|over|under)";
const IKKE_REFERANSE = "(?<!(?:gnr|bnr|gbnr|nr|plan|planid|pkt|punkt|kap|fv|rv|kv|ev|felt|side|vedlegg|§)[.\\u2024]? ?)";
const MENGDE = new RegExp(
  `(?:${FORAN} )?${IKKE_REFERANSE}${TALL}(?: ?[-–] ?${TALL}| til ${TALL}| og ${TALL})?(?= ?(?:${ENHETSTEGN})(?![a-zæøå])| (?!og |til |i |på |av |er |ble |har |m\\.|mfl)[a-zæøå]{3,}|[a-zæøå]{4,}|-(?:manns|avdelings|etasjes|roms|sengs))`,
  "g",
);
const ÅRSTALL = /^(?:19|20)\d{2}$/;
/** Tallord gjør samme jobb som siffer: «to fritidsboliger». */
const TALLORD = /(?<=^| )(?:to|tre|fire|fem|seks|sju|syv|åtte|ni|ti|elleve|tolv|tjue|tretti|førti|femti|hundre)(?= (?:nye |nytt |)(?!og |til )[a-zæøå]{4,})/gi;

/** Ligaturer som egne tegn skrives ut. Mangler de helt, forkastes setningen (se `harTaptLigatur`). */
function utenLigaturtegn(tekst: string): string {
  return tekst.replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/ﬀ/g, "ff").replace(/ﬃ/g, "ffi").replace(/ﬄ/g, "ffl");
}

/**
 * «legge l re e for», «arealeffek v»: «ti» og «tt» er falt ut av tekstlaget. Det gjelder hele
 * dokumentet, og bokstavene kan ikke settes tilbake uten å gjette. Kjennetegnet er løse
 * konsonanter som egne ord. Vokalene «å», «i» og «e» (nynorsk «er») er vanlige ord og teller ikke.
 */
export function harTaptLigatur(setning: string): boolean {
  return /(?:^| )[bcdfghjklmnpqrstvwxz](?= |$)/.test(setning) || /(?:^| )(?:lre|lh[øo]r|lh[øo]yr|lbud|lpasn|lknyt|ltak)/.test(setning);
}

/**
 * Om et helt dokument har mistet ligaturene. «til» er et av de vanligste ordene i norsk; et
 * dokument der en løs «l» er vanligere enn «til», er ødelagt.
 */
export function dokumentHarTaptLigatur(normalisert: string): boolean {
  const til = normalisert.match(/ til /g)?.length ?? 0;
  const løsL = normalisert.match(/ l /g)?.length ?? 0;
  return løsL >= 3 && løsL > til;
}

/**
 * Punktum som ikke avslutter en setning: forkortelser («gnr. 7»), datoer og desimaltall. De byttes
 * med et annet tegn mens setningen letes fram, og settes tilbake i sitatet.
 */
const MASKE = "\u2024";
const FORKORTELSER =
  "gnr|bnr|gbnr|g\\.nr|b\\.nr|ca|pkt|jf|jfr|nr|evt|tidl|inkl|mv|kap|fv|rv|kv|dvs|osv|hhv|iht|ev|maks|min|vedr|ref|st|bl\\.a|f\\.eks|m\\.fl|m\\.m|mfl|o\\.l|e\\.l|d\\.d";

function maskerPunktum(tekst: string): string {
  return tekst
    .replace(new RegExp(`(?<=^|[\\s(/])(${FORKORTELSER})\\.`, "gi"), (treff) => treff.replace(/\./g, MASKE))
    .replace(/(\d)\.(?=\d)/g, `$1${MASKE}`);
}

const avmasker = (tekst: string) => tekst.replaceAll(MASKE, ".");

/** Linjeskift, orddeling og styretegn fra PDF-en bort, så en setning er én linje. */
export function normaliserDokumenttekst(tekst: string): string {
  return utenLigaturtegn(tekst)
    .replace(/\u00ad/g, "")
    .replace(/([a-zæøå])[-‐]\s*\n\s*([a-zæøå])/g, "$1$2")
    .replace(/([a-zæøå])‐ ([a-zæøå])/g, "$1$2")
    // Tegn uten Unicode-verdi (tapte ligaturer) blir mellomrom, slik at hullet kan oppdages.
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\ue000-\uf8ff\ufffd]/g, " ")
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

/** Fjerner mengdeangivelser fra sitatet og markerer utelatelsen. */
export function utenMengder(setning: string): string {
  return setning
    .replace(MENGDE, (treff) => (ÅRSTALL.test(treff) ? treff : "[…]"))
    .replace(TALLORD, "[…]")
    .replace(/(?:\[…\][ ,]*(?:og|til|–|-)?[ ,]*)+\[…\]/g, "[…]")
    .replace(/\s+/g, " ")
    .trim();
}

function rens(sitat: string): string | null {
  let setning = sitat.replace(/\s+/g, " ").trim();
  // Punktlister og kolon-innledninger er ikke én setning.
  if (/[•▪◦]| - .* - |:\s*$|^å:|\.{4,}/.test(setning)) return null;
  if (FELT_UTEN_INNHOLD.test(setning)) return null;
  if (FORKORTELSE.test(avmasker(setning))) return null;
  if (INNHOLDSLØS.test(setning)) return null;
  if (harTaptLigatur(setning)) return null;
  // «=lre9elegge»: tegn fra en ødelagt skrifttabell midt i ord.
  if (/[a-zæøå][=\d][a-zæøå]{2,}[\d=]|(?:^| )=[a-zæøå]|[a-zæøå]=/.test(avmasker(setning))) return null;
  // Parenteser som ikke lukkes betyr at setningen ble kuttet ved et punktum inne i parentesen.
  if ((setning.match(/\(/g)?.length ?? 0) !== (setning.match(/\)/g)?.length ?? 0)) return null;

  setning = avmasker(utenMengder(setning));
  if (setning.length < MIN_TEGN || setning.length > FORMAAL_MAKS_TEGN) return null;
  // Etter at mengdene er tatt ut må det fortsatt stå noe om hva saken gjelder.
  if (setning.replace(/\[…\]/g, "").replace(/(?:å )?(?:legge|leggja|leggje) til rette for|(?:å )?tilrettelegge for/i, "").trim().length < 12) return null;
  return setning;
}

/** Første setning i en tekst: fram til punktum fulgt av mellomrom og stor bokstav, eller slutten. */
function førsteSetning(tekst: string): string {
  const slutt = tekst.search(/\.(?= [A-ZÆØÅ«"(]|$)/);
  return (slutt === -1 ? tekst : tekst.slice(0, slutt)).trim();
}

/** Innholdet i skjemafeltet «Hensikten med planarbeidet», når dokumentet er varselskjemaet. */
function skjemafelt(dokumenttekst: string): string | null {
  const tekst = maskerPunktum(normaliserDokumenttekst(dokumenttekst));
  if (dokumentHarTaptLigatur(tekst)) return null;
  const felt = SKJEMAFELT.exec(tekst)?.[1]?.trim();
  return felt && !FELT_UTEN_INNHOLD.test(felt) ? felt : null;
}

/** En eksplisitt formålssetning inne i skjemafeltet. */
export function finnFormaalISkjema(dokumenttekst: string): string | null {
  const felt = skjemafelt(dokumenttekst);
  if (!felt) return null;
  for (const mønster of MØNSTRE) {
    const treff = mønster.exec(`${felt}.`);
    const ren = treff?.[1] ? rens(treff[1]) : null;
    if (ren) return ren;
  }
  return null;
}

/**
 * Feltet brukes i praksis også til møteinnkallinger og påminnelser («Dette er en påminner om
 * nabomøte 8. september»). Første setning godtas derfor bare når den åpner som en beskrivelse av et
 * tiltak, og ikke handler om saksgangen.
 */
const TILTAKSÅPNING =
  /^(?:å |endre |endring av (?:areal)?formål|regulere |omregulere |legge til rette|leggja til rette|leggje til rette|tilrettelegge |etablere |utvide |utviding |utvidelse av |bygge |oppføre |sikre |det (?:foreslås|planlegges|planleggast|ønskes|søkes)|ein søker|det vert søkt|planen (?:skal|vil|gjelder)|planarbeidet (?:skal|vil|gjelder|omfatter)|planendringen (?:skal|vil|gjelder|har)|endringen (?:gjelder|skal|vil)|tiltakshaver (?:ønsker|planlegger)|forslagsstiller (?:ønsker|planlegger)|grunneier (?:ønsker|planlegger)|ønsker å )/i;
const SAKSGANG = /møte|påminn|merknad|frist|sendt ut|kunngjør|høring|forelegging|varsel|varsl|kl\.? ?\d|innspill|uttale/i;

/**
 * Første setning i skjemafeltet, som den står. Feltet er svaret på «hva er hensikten», men uten en
 * eksplisitt formålsformulering er setningen like ofte en beskrivelse av prosessen. Derfor sist, og
 * bare når setningen åpner som en beskrivelse av tiltaket.
 */
export function førsteSetningISkjema(dokumenttekst: string): string | null {
  const felt = skjemafelt(dokumenttekst);
  if (!felt) return null;
  const setning = førsteSetning(felt);
  if (!TILTAKSÅPNING.test(setning) || SAKSGANG.test(setning)) return null;
  return rens(setning);
}

/** En eksplisitt formålssetning i løpende tekst, eller null når ingen ren setning finnes. */
export function finnFormaal(dokumenttekst: string): string | null {
  const tekst = maskerPunktum(normaliserDokumenttekst(dokumenttekst));
  if (dokumentHarTaptLigatur(tekst)) return null;
  for (const mønster of MØNSTRE) {
    const treff = mønster.exec(tekst);
    if (!treff?.[1]) continue;
    const ren = rens(treff[1]);
    if (ren) return ren;
  }
  return null;
}

export interface DokumentTekst<Id = string> {
  id: Id;
  type: string;
  /** Dokumentets dato (YYYY-MM-DD). Nyeste dokument av samme type vinner. */
  date: string | null;
  text: string;
}

const SKJEMATYPER: readonly FormaalDokumenttype[] = ["ref-data-as-pdf", "Planvarsel"];

export type FormaalMetode = "skjemafelt" | "setning" | "skjemafelt_forste_setning";

/**
 * Formålet for en sak. Rekkefølgen er dokumentert i håndboka:
 *
 * 1. En eksplisitt formålssetning i skjemafeltet «Hensikten med planarbeidet» i varselet. Feltet
 *    gjelder denne planen og ingenting annet, og er det nærmeste kilden har et strukturert formål.
 * 2. En eksplisitt formålssetning i planinitiativet, som forskriften krever at beskriver formålet.
 * 3. En eksplisitt formålssetning i varselet, deretter i referatet fra oppstartsmøtet.
 * 4. Første setning i skjemafeltet, som den står.
 *
 * Av flere dokumenter av samme type brukes det nyeste først.
 */
export function finnFormaalIDokumenter<Id>(
  dokumenter: readonly DokumentTekst<Id>[],
): { formaal: string; documentId: Id; documentType: FormaalDokumenttype; metode: FormaalMetode } | null {
  const nyesteFørst = (type: string) =>
    dokumenter.filter((dokument) => dokument.type === type).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const forsøk = (
    typer: readonly FormaalDokumenttype[],
    finn: (tekst: string) => string | null,
    metode: FormaalMetode,
  ) => {
    for (const type of typer) {
      for (const dokument of nyesteFørst(type)) {
        const formaal = finn(dokument.text);
        if (formaal) return { formaal, documentId: dokument.id, documentType: type, metode };
      }
    }
    return null;
  };

  return (
    forsøk(SKJEMATYPER, finnFormaalISkjema, "skjemafelt") ??
    forsøk(FORMAAL_DOKUMENTTYPER, finnFormaal, "setning") ??
    forsøk(SKJEMATYPER, førsteSetningISkjema, "skjemafelt_forste_setning")
  );
}

/** Kort utgave til kortet i saklista. Kuttes ved ordgrense og markeres. */
export function kortFormaal(formaal: string, maks = 150): string {
  if (formaal.length <= maks) return formaal;
  const kutt = formaal.slice(0, maks);
  const sisteMellomrom = kutt.lastIndexOf(" ");
  return `${kutt.slice(0, sisteMellomrom > 60 ? sisteMellomrom : maks).replace(/[,;:–-]$/, "")} …`;
}
