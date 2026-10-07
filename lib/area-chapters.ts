import { SAKER_SECTION_ID } from "@/types/area-feature";

/**
 * Kapitlene på resultatsiden.
 *
 * Seksjonene (types/area-feature.ts) er hvordan dataene er ordnet. Kapitlene er hvordan en
 * boligkjøper leser dem: først det som gjelder selve adressen, så det som kan endre seg, så
 * hverdagen, så det som ligger i nærheten. Dette er ren presentasjon — ingen seksjon, kategori
 * eller formulering er endret.
 *
 * «Nærområdet» deles i to: gruppen med skoler og barnehager hører til hverdagen, resten er steder
 * i nærheten. Delingen skjer på gruppe-id, og en gruppe vi ikke kjenner havner i nærområdet.
 */
export const HVERDAG_CLUSTER = "skoler-og-barnehager";

export type ChapterPart =
  | { kind: "section"; sectionId: string; clusters?: "hverdag" | "ovrige" }
  | { kind: "saker" }
  | { kind: "skolekrets" }
  | { kind: "friluft" };

export interface Chapter {
  id: string;
  label: string;
  /** Én linje som sier hva kapittelet handler om. */
  lead: string | null;
  parts: ChapterPart[];
}

const KAPITLER: readonly { id: string; label: string; lead: string | null; sections: readonly string[] }[] = [
  { id: "ved-adressen", label: "Ved adressen", lead: "Forhold som gjelder selve søkepunktet.", sections: ["stoy", "grunnforhold"] },
  { id: "endring", label: "Hva kan endre seg", lead: null, sections: [SAKER_SECTION_ID] },
  { id: "hverdagen", label: "Hverdagen", lead: null, sections: [] },
  { id: "naeromradet", label: "I nærområdet", lead: "Steder og anlegg innenfor valgt radius.", sections: ["infrastruktur", "naeromradet"] },
  { id: "utforsk", label: "Utforsk området", lead: null, sections: ["tilfluktsrom"] },
];

const PLASSERT = new Set(KAPITLER.flatMap((k) => k.sections));

/**
 * Bygger kapitlene av seksjonsrekkefølgen serveren har bestemt.
 *
 * `lifted` er seksjoner serveren har løftet foran alt annet og som ikke har et kapittel (i admins
 * visning: forurenset grunn under søkepunktet). De vises først, utenfor kapitlene. Andre ukjente
 * seksjoner legges sist i «I nærområdet», så ingenting forsvinner når en ny seksjon kommer til.
 */
export function buildChapters(order: readonly string[]): { lifted: string[]; chapters: Chapter[] } {
  const known = new Set(order);
  const ukjente = order.filter((id) => !PLASSERT.has(id));
  const forste = order[0];
  const lifted = forste !== undefined && !PLASSERT.has(forste) ? [forste] : [];
  const rest = ukjente.filter((id) => !lifted.includes(id));

  const chapters = KAPITLER.map((kapittel): Chapter => {
    const parts: ChapterPart[] = [];
    // Delene som rendres på serveren står først i kapittelet sitt: de kan mangle, og en tom del
    // sist ville etterlatt skillelinjen over seg.
    if (kapittel.id === "utforsk") parts.push({ kind: "friluft" });
    if (kapittel.id === "hverdagen") {
      parts.push({ kind: "skolekrets" });
      if (known.has("naeromradet")) parts.push({ kind: "section", sectionId: "naeromradet", clusters: "hverdag" });
    }
    for (const sectionId of kapittel.sections) {
      if (!known.has(sectionId)) continue;
      if (sectionId === SAKER_SECTION_ID) parts.push({ kind: "saker" });
      else if (sectionId === "naeromradet") parts.push({ kind: "section", sectionId, clusters: "ovrige" });
      else parts.push({ kind: "section", sectionId });
    }
    if (kapittel.id === "naeromradet") for (const sectionId of rest) parts.push({ kind: "section", sectionId });
    return { id: kapittel.id, label: kapittel.label, lead: kapittel.lead, parts };
  });

  return { lifted, chapters };
}
