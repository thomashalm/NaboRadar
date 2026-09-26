import type { NearbyResearch } from "@/lib/admin/research-types";
import { ResearchFunn } from "./ResearchFunn";

/**
 * Intern research, øverst i admin-adressevisningen.
 *
 * Den ligger før det offentlige resultatet fordi det er den som er grunnen til at en operatør
 * bruker denne siden i stedet for /omrade. Introen er bevisst liten: merkelappen INTERN sier
 * det som må sies, og plassen skal gå til funnene.
 */
export function InternSeksjon({
  funn,
  radiusM,
}: {
  /** Null betyr at oppslaget feilet, tom liste at det ikke er noen funn. */
  funn: NearbyResearch[] | null;
  radiusM: number;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-dashed border-line-strong bg-ink/[0.02] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Intern research</h2>
        <span className="inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-accent ring-1 ring-accent/20 ring-inset">
          INTERN
        </span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">Kun synlig for innloggede driftsbrukere.</p>

      {funn === null ? (
        <p className="mt-3 text-[13px] text-muted">Fikk ikke hentet interne funn akkurat nå.</p>
      ) : (
        <ResearchFunn funn={funn} radiusM={radiusM} />
      )}
    </section>
  );
}
