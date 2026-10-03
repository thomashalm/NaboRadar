import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SITE_URL } from "@/app/layout";
import { AreaShell } from "@/components/area/AreaShell";
import { breadcrumbList, countyHref } from "@/lib/huts/counties";
import { buildHutHref } from "@/lib/huts/href";
import { getCountyHuts } from "@/lib/huts/queries";
import { HUT_TYPE_LABELS, countyIntro, countyMetaDescription, countyPageTitle, hutTypeCount, hutsAndCabins } from "@/lib/huts/wording";

/**
 * Hytter og koier i ett fylke: /hytter/fylke/innlandet.
 *
 * Tekstside uten kart. Den gir mennesker en oversikt og søkemotorer en lenkevei fra /hytter via
 * fylket til hver hytte. Innholdet er bare det vi har: antall, typer, kommuner og navn. Hytter
 * uten kommune står ikke her, og heller ikke hytter som ikke er for allmennheten.
 *
 * Caches som hyttesidene: laget ved første besøk, fornyet etter en time, og tømt av /admin/hytter.
 * Feiler databasen, kastes en feil som ikke caches. Se ADR 014.
 */
type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

/** Ingen sider bygges på forhånd; hvert fylke lages og caches første gang det blir besøkt. */
export function generateStaticParams() {
  return [];
}

const hentFylke = cache((slug: string) => getCountyHuts(slug));

async function hent(params: Props["params"]) {
  const fylke = await hentFylke((await params).slug);
  return fylke && fylke.total > 0 ? fylke : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fylke = await hent(params);
  if (!fylke) return { title: "Fylket finnes ikke", robots: { index: false, follow: true } };
  const tittel = countyPageTitle(fylke.county);
  return {
    title: tittel,
    description: countyMetaDescription(fylke),
    alternates: { canonical: countyHref(fylke.county) },
    openGraph: { type: "website", siteName: "NaboRadar", locale: "nb_NO", title: tittel, description: countyMetaDescription(fylke), url: countyHref(fylke.county) },
  };
}

export default async function CountyPage({ params }: Props) {
  const fylke = await hent(params);
  if (!fylke) notFound();
  const brødsmuler = breadcrumbList([
    { name: "Hytter og koier", url: new URL("/hytter", SITE_URL).toString() },
    { name: fylke.county, url: new URL(countyHref(fylke.county), SITE_URL).toString() },
  ]);

  return (
    <AreaShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brødsmuler).replace(/</g, "\\u003c") }} />
      <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
        <nav aria-label="Brødsmulesti" className="text-[13px] text-muted">
          <Link href="/hytter" className="hover:text-ink">
            Hytter og koier
          </Link>
        </nav>
        <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{countyPageTitle(fylke.county)}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted text-pretty">{countyIntro(fylke)}</p>

        <section aria-labelledby="fylke-typer" className="mt-6">
          <h2 id="fylke-typer" className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {hutsAndCabins(fylke.total)}
          </h2>
          <p className="mt-1.5 text-[15px] text-ink">{fylke.types.map((t) => hutTypeCount(t.type, t.count)).join(" · ")}</p>
        </section>

        <nav aria-label="Kommuner" className="mt-6 text-[13px] leading-relaxed text-muted">
          {fylke.municipalities.map((m, i) => (
            <span key={m.number}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <a href={`#kommune-${m.number}`} className="hover:text-ink">
                {m.name}
              </a>
            </span>
          ))}
        </nav>

        {fylke.municipalities.map((m) => (
          <section key={m.number} id={`kommune-${m.number}`} aria-labelledby={`kommune-${m.number}-tittel`} className="mt-9 scroll-mt-20">
            <h2 id={`kommune-${m.number}-tittel`} className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {m.name} <span className="text-[13px] font-normal text-muted">· {hutsAndCabins(m.huts.length)}</span>
            </h2>
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
              {m.huts.map((hut) => (
                <li key={hut.id}>
                  <Link href={buildHutHref(hut)} className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-canvas">
                    <span className="min-w-0 text-[15px] font-medium text-ink">{hut.name}</span>
                    <span className="shrink-0 text-[13px] text-muted">{HUT_TYPE_LABELS[hut.type] ?? "Hytte"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-10 text-[13px] leading-relaxed text-muted">
          Hyttene er hentet fra Kartverkets kartdata. NaboRadar viser verken ledighet eller åpningstider — se hyttesiden for hvor du
          går videre. <Link href="/hytter" className="text-accent hover:underline">Se alle hytter og koier i kartet</Link>.
        </p>
      </main>
    </AreaShell>
  );
}
