import type { Metadata } from "next";
import Link from "next/link";
import { HytteLenker, HytteSak } from "@/components/admin/HytteKontroll";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { hentHytteKø, søkHytter } from "@/lib/admin/huts";
import { getAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Hytter og koier", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Hytter og koier: kontrollkø og offisielle lenker.
 *
 * Synken bygger hyttene av seg selv. Hit kommer bare det et menneske må avgjøre: en hytte som
 * bare står i en sekundærkilde, to som ligger tett, eller kilder som er uenige om typen. Under
 * køen legges de offisielle lenkene inn — for hånd, fordi en lenke ikke skal gjettes.
 */
export default async function AdminHutsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Hytter og koier" state={session.state} />;

  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const [{ saker, feil }, treff] = await Promise.all([
    hentHytteKø(session.client),
    q.length >= 2 ? søkHytter(session.client, q) : Promise.resolve([]),
  ]);

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

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Offisielle lenker</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-muted">
          Legg bare inn lenker du selv har åpnet og sett at gjelder hytta. Ingen lenke er bedre enn en gjettet.
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
        {q.length >= 2 && treff.length === 0 && <p className="mt-3 text-[15px] text-muted">Ingen treff på «{q}».</p>}
        <ul className="mt-4 space-y-3">
          {treff.map((hytte) => (
            <HytteLenker key={hytte.id} hytte={hytte} />
          ))}
        </ul>
      </section>
    </main>
  );
}
