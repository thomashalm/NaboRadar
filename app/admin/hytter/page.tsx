import type { Metadata } from "next";
import Link from "next/link";
import { HytteKontakt, HytteSak, HytteStatus } from "@/components/admin/HytteKontroll";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { hentHytteKontakt, hentHytteKø, hentKontaktstatus, hentStatuskø } from "@/lib/admin/huts";
import { HUT_NEXT_STEP_LABELS, type HutNextStepKind } from "@/lib/huts/wording";
import { getAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Hytter og koier", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Hytter og koier: kontrollkø, og bestilling og kontakt.
 *
 * Synken bygger hyttene av seg selv. Hit kommer bare det et menneske må avgjøre: en hytte som
 * bare står i en sekundærkilde, to som ligger tett, eller kilder som er uenige om typen. Under
 * køen står de låste hyttene med det de mangler av bestillingslenke, infoside og forvalter.
 * Opplysningene legges inn for hånd, fordi en lenke ikke skal gjettes.
 */
export default async function AdminHutsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Hytter og koier" state={session.state} />;

  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const dntGap = (await searchParams).vis === "dnt" && q.length < 2;
  const [{ saker, feil }, kontakt, status, stengte] = await Promise.all([
    hentHytteKø(session.client),
    hentHytteKontakt(session.client, q.length >= 2 ? q : null, dntGap ? "dnt_gap" : null),
    hentKontaktstatus(session.client),
    hentStatuskø(session.client),
  ]);
  const forfalt = stengte.filter((hytte) => hytte.overdue).length;
  // Tellingen gjelder alle låste hytter som vises, ikke bare dem som får plass i listen under.
  const antall = (kind: HutNextStepKind) => status[kind] ?? 0;
  const låste = (["unknown", "manager_only", "info_link", "booking_link"] as const).reduce((sum, kind) => sum + antall(kind), 0);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8">
        <p className="text-[13px] text-muted">
          <Link href="/admin" className="hover:text-ink">
            Admin
          </Link>
          {" · "}
          <Link href="/hytter" className="hover:text-ink">
            Hyttekartet
          </Link>
        </p>
        <h1 className="mt-1 text-[28px] font-medium tracking-tight text-ink">Hytter og koier</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Som innlogget admin ser du hyttene i kartet og på områdesiden også før kategorien er publisert.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-ink">Til kontroll · {saker.length}</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-muted">
          Godkjenn når hytta er riktig, avvis når den ikke skal vises, og slå sammen når to rader er samme hytte.
        </p>
        {feil && <p className="mt-3 text-[13px] text-danger">Fikk ikke hentet køen: {feil}</p>}
        {!feil && saker.length === 0 && <p className="mt-3 text-[15px] text-muted">Ingen saker venter.</p>}
        <ul className="mt-4 space-y-3">
          {saker.map((sak) => (
            <HytteSak key={sak.id} sak={sak} />
          ))}
        </ul>
      </section>

      {stengte.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-ink">
            Status må kontrolleres · {forfalt} av {stengte.length}
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">
            Hytter som står som midlertidig stengt. Ingen kilde oppdaterer dette, så hver stenging har en dato for ny kontroll.
            Åpne forvalterens side og velg: fortsatt stengt, eller åpen igjen. Statusen oppheves aldri av seg selv.
          </p>
          <ul className="mt-4 space-y-3">
            {stengte.map((hytte) => (
              <HytteStatus key={hytte.id} hytte={hytte} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Bestilling og kontakt</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-muted">
          En låst hytte må bestilles på forhånd, og da skal siden si hvor — eller si at vi ikke vet. Legg bare inn lenker du selv
          har åpnet og sett at gjelder hytta, og forvalteren slik den offisielle siden oppgir. Ingen lenke er bedre enn en gjettet.
          Under «Avvik fra Kartverket» kan type og tilgang korrigeres når forvalterens egen side sier noe annet; kildens verdi
          står urørt ved siden av.
        </p>
        <form className="mt-3 flex gap-2" action="/admin/hytter">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Søk etter hytte"
            className="h-9 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-[14px]"
          />
          <button type="submit" className="h-9 rounded-lg border border-line px-3 text-[13px] font-medium hover:border-line-strong">
            Søk
          </button>
        </form>
        {kontakt.feil && <p className="mt-3 text-[13px] text-danger">Fikk ikke hentet hyttene: {kontakt.feil}</p>}
        {q.length >= 2 ? (
          kontakt.hytter.length === 0 && !kontakt.feil && <p className="mt-3 text-[15px] text-muted">Ingen treff på «{q}».</p>
        ) : dntGap ? (
          <p className="mt-3 text-[13px] text-ink">
            {kontakt.hytter.length} DNT-hytter uten kontrollert forening eller offisiell lenke. Vanlige hytter står først;
            rastebuer og nødbuer har ofte ingen egen side, og notatet sier hvorfor.{" "}
            <Link href="/admin/hytter" className="underline">
              Vis låste hytter
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-ink">
            {låste} låste hytter:{" "}
            {(["unknown", "manager_only", "info_link", "booking_link"] as const)
              .map((kind) => `${antall(kind)} ${HUT_NEXT_STEP_LABELS[kind].toLowerCase()}`)
              .join(" · ")}
            . Listen viser de som mangler bestillingsside, høyst 100, med de som mangler mest først. Søk for å finne en bestemt hytte.{" "}
            <Link href="/admin/hytter?vis=dnt" className="underline">
              Vis DNT uten forening eller lenke
            </Link>
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {kontakt.hytter.map((hytte) => (
            <HytteKontakt key={hytte.id} hytte={hytte} />
          ))}
        </ul>
      </section>
    </main>
  );
}
