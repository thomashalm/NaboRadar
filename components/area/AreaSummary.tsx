import type { SummaryItem } from "@/lib/area-summary";

/**
 * «Området i korte trekk»: én linje per tema, rett under adressen.
 *
 * Linjene er de samme som står på seksjonene lenger ned (lib/area-summary.ts), og hver lenker
 * dit. Ingen farger, haker eller varseltrekanter: en linje her er en opplysning, ikke en dom.
 */
export function AreaSummary({ items }: { items: readonly SummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="korte-trekk" className="mt-9 border-t border-ink/15 pt-6">
      <h2 id="korte-trekk" className="type-h2 text-ink">
        Området i korte trekk
      </h2>
      <dl className="mt-2 divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="grid gap-x-5 gap-y-0.5 py-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
            <dt className="text-sm font-medium text-subtle sm:pt-px">{item.label}</dt>
            <dd className="min-w-0">
              {item.text === null ? (
                <span role="status" className="flex h-6 items-center">
                  <span className="sr-only">Henter {item.label.toLowerCase()} …</span>
                  <span aria-hidden="true" className="h-2 w-44 max-w-full animate-pulse rounded-full bg-line" />
                </span>
              ) : (
                <a
                  href={item.href}
                  className="group flex items-start justify-between gap-3 rounded-control text-[15px] leading-normal text-ink"
                >
                  <span className="[overflow-wrap:anywhere] group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-3">
                    {item.text}
                  </span>
                  <span aria-hidden="true" className="mt-px shrink-0 text-subtle group-hover:text-ink">
                    ↓
                  </span>
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="type-meta mt-3">Hentet fra seksjonene under. NaboRadar vurderer ikke området.</p>
    </section>
  );
}
