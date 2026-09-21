import { formatRadius } from "@/lib/format";

/**
 * Plassen der event-feeden kommer i fase 4. Samme ytre struktur (overskrift + liste)
 * slik at ekte saker kan settes inn uten redesign. Viser aldri eksempel- eller demodata.
 */
export function EventsSection({ radius }: { radius: number }) {
  return (
    <section aria-labelledby="events-heading">
      <h2 id="events-heading" className="text-lg font-semibold tracking-tight">
        Saker i området
      </h2>
      <div className="mt-4 rounded-2xl border border-dashed border-line-strong px-5 py-6">
        <p className="text-[15px] font-medium text-ink">Plandata kobles til i neste steg.</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          Her kommer varslet planarbeid innen {formatRadius(radius)}, hentet fra Direktoratet for
          byggkvalitet.
        </p>
      </div>
    </section>
  );
}
