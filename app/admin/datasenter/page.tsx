import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/session";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { DatasenterRefresh } from "@/components/admin/DatasenterRefresh";
import { DatasenterKort } from "@/components/admin/DatasenterKort";
import {
  hentDatasentre,
  hentKandidatAntall,
  hentKø,
  hentRefreshKjøringer,
  MANGLER_LABEL,
} from "@/lib/admin/datacenter";

export const metadata: Metadata = { title: "Datasentre", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Datasenter-flaten: enrichment og refresh samlet ett sted.
 *
 * Egen side og ikke en fane i research-kartet, fordi de svarer på ulike spørsmål. Kartet spør
 * «hvor i landet finnes denne typen funn?». Denne spør «hva vet vi om anleggene, og hva mangler?».
 * Refresh-køen hører hjemme her, ikke i et kart.
 */
export default async function DatasenterPage() {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Datasentre" state={session.state} />;

  const [{ anlegg, feil }, { kjøringer }, antall] = await Promise.all([
    hentDatasentre(session.client),
    hentRefreshKjøringer(session.client, 5),
    hentKandidatAntall(session.client),
  ]);

  const aktiv = kjøringer.find((k) => k.status === "queued" || k.status === "running") ?? null;
  const kø = aktiv ? await hentKø(session.client, aktiv.id) : [];
  const køStatus = new Map(kø.map((l) => [l.research_item_id, l]));

  // Hvor mange anlegg som mangler hvert felt. Sier hvor arbeidet faktisk ligger.
  const mangler = new Map<string, number>();
  for (const a of anlegg) for (const f of a.missing_fields) mangler.set(f, (mangler.get(f) ?? 0) + 1);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <p className="text-[13px] text-muted">
          <Link href="/admin" className="hover:text-ink">
            Admin
          </Link>
          {" · "}
          <Link href="/admin/kart?kategori=datasenter" className="hover:text-ink">
            Research-kart
          </Link>
        </p>
        <h1 className="mt-1 text-[28px] font-medium tracking-tight text-ink">Datasentre</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          {anlegg.length} anlegg i researchbasen. Intern flate — ingenting herfra vises i {""}
          <code className="text-[13px]">/omrade</code>.
        </p>
      </header>

      {feil && <p className="mb-6 rounded-xl border border-danger/40 p-4 text-[13px] text-danger">{feil}</p>}

      <DatasenterRefresh antall={antall} aktiv={aktiv} />

      {mangler.size > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[15px] font-medium text-ink">Hva som mangler</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            {[...mangler.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([felt, n]) => (
                <li key={felt} className="text-muted">
                  <span className="tabular-nums text-ink">{n}</span> mangler {MANGLER_LABEL[felt] ?? felt}
                </li>
              ))}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Et felt som er undersøkt uten å finnes, settes til «ukjent» og forsvinner herfra. Ukjent er
            bedre enn gjetting.
          </p>
        </section>
      )}

      {kjøringer.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[15px] font-medium text-ink">Siste kjøringer</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {kjøringer.map((k) => (
              <li key={k.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-[13px]">
                <span className="text-ink">
                  {k.mode === "full" ? "Full refresh" : "Review-refresh"} ·{" "}
                  <span className="text-muted">{k.status}</span>
                </span>
                <span className="tabular-nums text-muted">
                  {k.checked}/{k.total} kontrollert · {k.changed} endret · {k.unchanged} uendret
                  {k.failed > 0 && <span className="text-danger"> · {k.failed} feil</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[15px] font-medium text-ink">Anlegg</h2>
        <ul className="mt-3 space-y-2">
          {anlegg.map((a) => (
            <DatasenterKort key={a.id} anlegg={a} kø={køStatus.get(a.id) ?? null} />
          ))}
        </ul>
      </section>
    </main>
  );
}
