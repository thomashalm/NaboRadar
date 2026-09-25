/**
 * Gir opp å vente på en kilde, og svarer med et fallback i stedet for å holde siden åpen.
 *
 * Hver kilde har sin egen frist, slik at én treg tjeneste bare gjør sin egen seksjon
 * utilgjengelig. Fristene er satt ut fra målte tider: databasen svarer på 100–800 ms, og de
 * direkte oppslagene har selv et budsjett på 8 s.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      console.error(`[timeout] kilden svarte ikke innen ${ms} ms`);
      resolve(fallback());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        console.error("[timeout] kilden feilet:", error);
        resolve(fallback());
      },
    );
  });
}
