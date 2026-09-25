import Link from "next/link";

/**
 * Meldingen en som ikke har driftstilgang får. Én komponent for alle driftssidene, slik at de
 * ikke svarer forskjellig på det samme spørsmålet.
 *
 * Dette er ikke sikkerhetsgrensen — databasen håndhever `is_admin()` selv, og en skjult lenke
 * beskytter ingenting. Det er bare et vennlig svar.
 */
export function IkkeTilgang({
  tittel,
  state,
}: {
  tittel: string;
  state: "unconfigured" | "signed-out" | "not-admin";
}) {
  return (
    <main className="mx-auto max-w-xl px-5 pt-[12vh] pb-24 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">{tittel}</h1>
      <p className="mt-3 text-lg text-muted">
        {state === "signed-out" ? "Logg inn for å bruke driftssidene." : "Denne siden krever driftstilgang."}
      </p>
      <Link href="/admin" className="mt-6 inline-block text-[15px] font-medium text-accent hover:underline">
        Til innlogging
      </Link>
    </main>
  );
}
