import { stoyGrenser } from "@/lib/facts/wording";
import type { AreaFact } from "@/types/area-feature";

/**
 * Støyskalaen: hvor et beregnet Lden-intervall ligger på en dB-akse.
 *
 * Skalaen tegner bare det kilden oppgir. Strategisk støykartlegging gir et intervall på 5 dB, og
 * det vises som et intervall — ikke som et punkt. Grensene for gul og rød støysone (T-1442) er
 * referansemerker: kartene viser ikke støysoner, og vi sier aldri at nivået *er* en sone.
 *
 * Vei og bane har hver sin skala, fordi grensene er ulike. De slås aldri sammen.
 */
export interface NoiseScale {
  /** Aksen, i dB. */
  min: number;
  max: number;
  /** Intervallet kilden oppgir. `to` er null for «75 og over». */
  from: number;
  to: number | null;
  /** Referansemerkene. */
  marks: { db: number; label: string }[];
  /** Skjermlesertekst: det samme som figuren viser. */
  description: string;
}

const AKSE = { min: 45, max: 80 } as const;

/** Leser «Lden 60–64 dB» og «Lden 75 dB eller mer» av overskriften kilden har fått. */
function lesIntervall(tekst: string): { from: number; to: number | null } | null {
  const intervall = /Lden\s+(\d{2})\s*[–-]\s*(\d{2})/.exec(tekst);
  if (intervall) return { from: Number(intervall[1]), to: Number(intervall[2]) };
  const apent = /Lden\s+(?:≥\s*|over\s+)?(\d{2})\s*dB\s*(?:eller mer|og over)?/.exec(tekst);
  return apent ? { from: Number(apent[1]), to: null } : null;
}

export function noiseScale(fact: Pick<AreaFact, "subtype" | "headline">): NoiseScale | null {
  const grenser = stoyGrenser(fact.subtype);
  const intervall = lesIntervall(fact.headline);
  if (!grenser || !intervall) return null;
  if (intervall.from < AKSE.min || intervall.from > AKSE.max) return null;

  const til = intervall.to === null ? `${intervall.from} dB eller mer` : `${intervall.from}–${intervall.to} dB`;
  return {
    ...AKSE,
    ...intervall,
    marks: [
      { db: grenser.gul, label: `Gul fra ${grenser.gul}` },
      { db: grenser.rod, label: `Rød fra ${grenser.rod}` },
    ],
    description: `Beregnet Lden ${til}. Til sammenligning går grensen for gul støysone ved ${grenser.gul} dB og rød ved ${grenser.rod} dB (T-1442).`,
  };
}

/**
 * Når støykartet ikke har noe nivå for stedet: «Under 50 dB i støykartene.»
 *
 * Da finnes det ikke noe intervall å tegne — bare at nivået ligger under kartets laveste. Skalaen
 * viser området under grensen, uten punkt og uten referansemerker: statusen gjelder vei og bane
 * samlet, og de har ulike grenser. Nevner kilden to grenser, tegner vi ingenting.
 */
export interface NoiseFloor {
  min: number;
  max: number;
  below: number;
  description: string;
}

export function noiseFloor(detail: string | null | undefined): NoiseFloor | null {
  if (!detail) return null;
  const verdier = [...detail.matchAll(/(\d{2})\s*dB/g)].map((m) => Number(m[1]));
  const [below] = verdier;
  if (verdier.length !== 1 || below === undefined || !/^Under\s/.test(detail)) return null;
  if (below <= AKSE.min || below >= AKSE.max) return null;
  return { ...AKSE, below, description: `Under ${below} dB, som er det laveste nivået støykartet viser.` };
}

/** Hvor på aksen en dB-verdi ligger, i prosent. */
export function scalePosition(scale: Pick<NoiseScale, "min" | "max">, db: number): number {
  const p = ((db - scale.min) / (scale.max - scale.min)) * 100;
  return Math.max(0, Math.min(100, Math.round(p * 10) / 10));
}
