import Link from "next/link";
import {
  ANLEGGSTYPE_LABEL,
  besteMW,
  MANGLER_LABEL,
  MW_FELT,
  type Anleggstype,
  type Datasenter,
  type KøLinje,
} from "@/lib/admin/datacenter-types";
import { OPERATIONAL_LABEL } from "@/lib/admin/research-types";

/**
 * Ett anlegg i lista.
 *
 * Sammenslått visning holdes til én linje pluss én metalinje. Et kort som er fire linjer høyt
 * gjør at 67 anlegg blir en side man må bla gjennom i stedet for å skanne. Alt det tunge —
 * roller, alle fem MW-tall, utvidelse, kilder — ligger bak `<details>` og hentes ikke før det
 * åpnes.
 *
 * MW vises alltid med hvilket tall det er. «700 MW» alene ville vært den feilen hele modellen
 * finnes for å unngå.
 */

function mw(n: number): string {
  return `${new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 }).format(n)} MW`;
}

function Rolle({ navn, verdi }: { navn: string; verdi: string | null }) {
  if (!verdi) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-muted">{navn}</dt>
      <dd className="text-ink">{verdi}</dd>
    </div>
  );
}

export function DatasenterKort({ anlegg: a, kø }: { anlegg: Datasenter; kø: KøLinje | null }) {
  const topp = besteMW(a);
  const type = (a.facility_type ?? "unknown") as Anleggstype;

  return (
    <li className="rounded-xl border border-line bg-surface">
      <details className="group">
        <summary className="cursor-pointer list-none px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[15px] text-ink">{a.title}</span>
            <span className="text-[13px] tabular-nums text-muted">
              {topp ? (
                <>
                  {mw(topp.verdi)} <span className="text-[11px]">{topp.label.toLowerCase()}</span>
                </>
              ) : (
                "kapasitet ukjent"
              )}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <span>{a.municipality ?? "kommune ukjent"}</span>
            <span aria-hidden>·</span>
            <span>{OPERATIONAL_LABEL[a.operational_status as keyof typeof OPERATIONAL_LABEL] ?? a.operational_status}</span>
            {(a.operators ?? a.owners) && (
              <>
                <span aria-hidden>·</span>
                <span className="text-ink">{a.operators ?? a.owners}</span>
              </>
            )}
            {type !== "unknown" && (
              <>
                <span aria-hidden>·</span>
                <span>{ANLEGGSTYPE_LABEL[type]}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>
              interesse {a.interest_level} / sikkerhet {a.confidence}
            </span>
            {a.missing_fields.length > 0 && (
              <span className="rounded-full bg-line/60 px-2 py-0.5 text-[11px]">
                mangler {a.missing_fields.map((f) => MANGLER_LABEL[f] ?? f).join(", ")}
              </span>
            )}
            {kø && kø.state === "pending" && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px]">i kø</span>
            )}
            {kø && kø.state !== "pending" && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px]">{kø.state}</span>
            )}
          </div>
        </summary>

        <div className="border-t border-line px-4 py-3 text-[13px] leading-relaxed">
          <dl className="space-y-1">
            <Rolle navn="Eier" verdi={a.owners} />
            <Rolle navn="Operatør" verdi={a.operators} />
            <Rolle navn="Kunde" verdi={a.customers} />
            <Rolle navn="Morselskap" verdi={a.parent_companies} />
            <Rolle navn="Investor" verdi={a.investors} />
            <Rolle navn="Grunneier" verdi={a.land_owners} />
          </dl>

          <div className="mt-3">
            <p className="text-muted">Kapasitet</p>
            <dl className="mt-1 space-y-0.5">
              {MW_FELT.map((m) => {
                const v = a[m.felt as keyof Datasenter] as number | null;
                if (v === null || v === undefined) return null;
                return (
                  <div key={m.felt} className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted" title={m.hjelp}>
                      {m.label}
                    </dt>
                    <dd className="tabular-nums text-ink">{mw(v)}</dd>
                  </div>
                );
              })}
              {!topp && <p className="text-muted">Ingen kapasitet registrert.</p>}
            </dl>
          </div>

          {(a.expansion_notes || a.expected_opening || a.opening_year) && (
            <div className="mt-3">
              <p className="text-muted">Utvidelse og åpning</p>
              {a.opening_year && <p className="text-ink">Åpnet {a.opening_year}</p>}
              {a.expected_opening && <p className="text-ink">Forventet åpning: {a.expected_opening}</p>}
              {a.expansion_notes && <p className="text-ink">{a.expansion_notes}</p>}
            </div>
          )}

          {kø && kø.search_plan.length > 0 && (
            <div className="mt-3">
              <p className="text-muted">Søkeplan i denne kjøringen</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {kø.search_plan.map((s) => (
                  <li key={s} className="rounded-full bg-line/50 px-2 py-0.5 text-[11px] text-ink">
                    {s}
                  </li>
                ))}
              </ul>
              {kø.queued_reasons.length > 0 && (
                <p className="mt-1.5 text-muted">I køen fordi: {kø.queued_reasons.join(" · ")}</p>
              )}
            </div>
          )}

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-muted">
            <span>{a.source_count} kilder</span>
            <span>
              Sist kontrollert{" "}
              {a.last_verified_at ? new Date(a.last_verified_at).toLocaleDateString("nb-NO") : "aldri"}
            </span>
            {a.last_enriched_at && (
              <span>Felt oppdatert {new Date(a.last_enriched_at).toLocaleDateString("nb-NO")}</span>
            )}
            <Link href={`/admin/research/${a.id}`} className="text-ink underline underline-offset-2">
              Åpne funn
            </Link>
          </p>
        </div>
      </details>
    </li>
  );
}
