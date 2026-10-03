import snapshot from "./bygningstyper.json";

/**
 * Bygningstype etter NS 3457, slik matrikkelen bruker den.
 *
 * Navnene kommer uendret fra SSB KLASS 31 (`bygningstyper.json`, oppdateres med
 * `scripts/update-bygningstyper.ts`). Tabellen var tidligere håndskrevet og hadde forskjøvne
 * koder: sykehus (719) ble vist som «Annen beredskapsbygning» og barneskole (613) som
 * «Museum eller bibliotek». Derfor ingen egne betegnelser her.
 */
const KODER: Record<string, string> = snapshot.koder;

/** Navnet på en bygningstypekode. null for ukjent kode: vi gjetter ikke bygningstype. */
export function bygningstypeNavn(kode: string | null | undefined): string | null {
  if (!kode) return null;
  return KODER[kode.trim()] ?? null;
}

export const BYGNINGSTYPE_KILDE = { navn: snapshot.kilde, versjon: snapshot.versjon, hentet: snapshot.hentet };
