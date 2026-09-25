import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { getResearchItem } from "@/lib/admin/research";
import {
  CATEGORY_SHORT,
  ITEM_TYPE_LABEL,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  SENSITIVITY_LABEL,
  VERIFICATION_LABEL,
} from "@/lib/admin/research-types";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { ResearchForm } from "@/components/admin/ResearchForm";
import { ResearchSources } from "@/components/admin/ResearchSources";
import { buildAreaHref } from "@/lib/area-params";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";

export const metadata: Metadata = { title: "Funn", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Ett funn: oppsummering, kilder, og skjemaet for å endre det.
 *
 * Kildene står over skjemaet med vilje. Det er dem man skal lese før man endrer en status —
 * hele poenget med provenance er at neste person kan se hva vurderingen hviler på.
 */
export default async function FunnPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Funn" state={session.state} />;

  const { id } = await params;
  // En ugyldig uuid skal gi 404, ikke en databasefeil.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const treff = await getResearchItem(session.client, id);
  if (!treff) notFound();
  const { item, sources } = treff;

  const meta = [
    ITEM_TYPE_LABEL[item.item_type],
    `${CATEGORY_SHORT[item.category] ?? item.category} / ${OPERATIONAL_LABEL[item.operational_status]}`,
    `${LEVEL_LABEL[item.confidence].toUpperCase()} SIKKERHET`,
    `INTERESSE ${LEVEL_LABEL[item.interest_level].toUpperCase()}`,
    SENSITIVITY_LABEL[item.sensitivity].toUpperCase(),
  ];

  return (
    <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8">
      <Link href="/admin/research" className="text-[15px] font-medium text-accent hover:underline">
        ← Research
      </Link>

      <p className="mt-6 text-[12px] font-medium tracking-[0.04em] text-muted uppercase">{meta.join(" · ")}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-balance">{item.title}</h1>
      <p className="mt-2 text-[15px] text-muted">
        {[item.address, item.postal_code, item.city, item.municipality].filter(Boolean).join(", ") || "Uten adresse"}
      </p>
      <p className="mt-1 text-[15px] text-ink">{VERIFICATION_LABEL[item.verification_status]}</p>

      {item.description && <p className="mt-4 text-[17px] leading-relaxed text-ink">{item.description}</p>}
      {item.why_interesting && (
        <div className="mt-4 rounded-2xl border border-line bg-surface px-5 py-4">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Hvorfor interessant</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{item.why_interesting}</p>
        </div>
      )}
      {item.reason_not_public && (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
          Skal ikke publiseres: {item.reason_not_public}
        </p>
      )}
      {item.notes && <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line text-muted">{item.notes}</p>}

      <dl className="mt-6 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
        <Rad navn="Lagt inn" verdi={`${dato(item.created_at)}${item.created_by ? ` av ${item.created_by}` : ""}`} />
        <Rad navn="Sist endret" verdi={dato(item.updated_at)} />
        <Rad navn="Først sett" verdi={dato(item.first_seen_at)} />
        <Rad navn="Sist sjekket" verdi={item.last_checked_at ? dato(item.last_checked_at) : "aldri"} />
        <Rad
          navn="Opphav"
          verdi={item.origin_type === "manual" ? "manuelt lead" : `import · ${item.origin_provider ?? "ukjent"}`}
        />
        <Rad
          navn="Koordinat"
          verdi={
            item.latitude !== null && item.longitude !== null
              ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
              : "mangler — vises ikke i adressesøket"
          }
        />
      </dl>

      {item.latitude !== null && item.longitude !== null && (
        <p className="mt-4">
          <Link
            href={buildAreaHref(
              {
                lat: item.latitude,
                lng: item.longitude,
                radius: DEFAULT_RADIUS_M,
                label: item.address ?? item.title,
              },
              "/admin/adresse",
            )}
            className="text-[15px] font-medium text-accent hover:underline"
          >
            Se området rundt funnet →
          </Link>
        </p>
      )}

      <ResearchSources itemId={item.id} sources={sources} />

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Endre funnet</h2>
        <ResearchForm item={item} />
      </section>
    </main>
  );
}

function Rad({ navn, verdi }: { navn: string; verdi: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5">
      <dt className="text-muted">{navn}</dt>
      <dd className="text-right text-ink">{verdi}</dd>
    </div>
  );
}

function dato(verdi: string): string {
  return new Date(verdi).toLocaleString("nb-NO", { dateStyle: "medium", timeStyle: "short" });
}
