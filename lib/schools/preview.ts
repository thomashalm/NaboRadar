/**
 * Hvilke skoler som står først i skolelisten på `/omrade`.
 *
 * Listen var sortert på avstand alene. I sentrum ga det tre videregående skoler øverst, mens
 * barneskolen — den en familie faktisk spør om — lå bak «Se alle». Regelen under er liten og
 * deterministisk, og bruker bare det vi allerede har: skoletype, trinn og avstand.
 *
 * De tre første plassene:
 *
 * 1. nærmeste skole med barnetrinn (1.–7.)
 * 2. nærmeste skole med ungdomstrinn (8.–10.) — er det samme skole som i 1, står den én gang
 * 3. en grunnskole uten registrerte trinn, hvis den ligger nærmere enn skolene i 1 og 2.
 *    Registeret mangler trinn for rundt hundre ekte grunnskoler, og en nærskole skal ikke
 *    forsvinne bak «Se alle» fordi et felt mangler. Vi vet ikke hva slags skole det er, så den
 *    erstatter ingen av de to over — den får plassen ved siden av.
 * 4. resten av plassene fylles med de nærmeste grunnskolene som er igjen — også dem uten
 *    registrerte trinn, for registertypen sier fortsatt grunnskole
 * 5. først når det ikke finnes flere grunnskoler innen radius, fylles det opp med videregående
 *
 * Mangler barneskole eller ungdomsskole innen radius, blir plassen ikke stående tom: da rykker
 * de neste opp. Videregående kan altså stå i de tre første, men aldri foran en grunnskole som
 * finnes innen radius. Ingen skoler hentes inn utenfra radien.
 *
 * Resten av listen — bak «Se alle» — er sortert på avstand, som før. Kartet er ikke berørt:
 * det tegner alle skolene innen radius.
 */
export type SchoolKind = "barneskole" | "ungdomsskole" | "barne_og_ungdomsskole" | "videregaende" | "skole";

const tall = (verdi: unknown): number | null => (typeof verdi === "number" && Number.isFinite(verdi) ? verdi : null);

/**
 * Skoletypen slik den vises, ut fra trinnene registeret oppgir.
 *
 * En grunnskole uten trinn er «skole»: vi gjetter ikke. En skole som dekker trinn på begge sider
 * av 7./8. er en barne- og ungdomsskole, også når den ikke har alle ti trinnene (5.–10.).
 */
export function schoolKind(input: { subtype: string; lavesteTrinn: unknown; hoyesteTrinn: unknown }): SchoolKind {
  if (input.subtype === "videregaende_skole") return "videregaende";
  const fra = tall(input.lavesteTrinn);
  const til = tall(input.hoyesteTrinn);
  if (fra === null || til === null) return "skole";
  if (til <= 7) return "barneskole";
  if (fra >= 8) return "ungdomsskole";
  return "barne_og_ungdomsskole";
}

const harBarnetrinn = (kind: SchoolKind) => kind === "barneskole" || kind === "barne_og_ungdomsskole";
const harUngdomstrinn = (kind: SchoolKind) => kind === "ungdomsskole" || kind === "barne_og_ungdomsskole";

/**
 * Skolene i visningsrekkefølge: de `preview` første etter regelen over, resten på avstand.
 *
 * `rows` må være sortert nærmest først. Ingen rader legges til eller fjernes.
 */
export function orderSchoolsForPreview<T>(rows: readonly T[], kindOf: (row: T) => SchoolKind, preview = 3): T[] {
  const kinds = rows.map(kindOf);
  const valgt: number[] = [];
  const velg = (index: number) => {
    if (index >= 0 && !valgt.includes(index) && valgt.length < preview) valgt.push(index);
  };

  const barne = kinds.findIndex(harBarnetrinn);
  const ungdom = kinds.findIndex(harUngdomstrinn);
  velg(barne);
  velg(ungdom);

  // Rader er sortert på avstand, så «nærmere enn» er «lavere indeks enn».
  const fjerneste = Math.max(barne, ungdom);
  const utenTrinn = kinds.findIndex((kind, index) => kind === "skole" && (fjerneste < 0 || index < fjerneste));
  velg(utenTrinn);

  // Grunnskoler først, så videregående. Begge på avstand.
  kinds.forEach((kind, index) => {
    if (kind !== "videregaende") velg(index);
  });
  kinds.forEach((_, index) => velg(index));

  return [...valgt.map((index) => rows[index]!), ...rows.filter((_, index) => !valgt.includes(index))];
}
