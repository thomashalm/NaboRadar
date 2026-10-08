import { AreaShell } from "@/components/area/AreaShell";

/** Samme form som den ferdige arbeidsflaten: adresse og temaoversikt til venstre, kartet til høyre. */
export default function AreaLoading() {
  return (
    <AreaShell>
      <div
        className="animate-pulse lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(24rem,40%)_minmax(0,1fr)]"
        role="status"
        aria-label="Laster området"
      >
        <div className="gutter pt-5 pb-8 lg:border-r lg:border-line lg:px-6">
          <div className="h-8 w-64 max-w-full rounded-control bg-line" />
          <div className="mt-2 h-4 w-28 rounded-full bg-line" />
          <div className="mt-4 h-11 w-56 rounded-control bg-line" />
          <div className="mt-8 h-5 w-48 rounded-full bg-line" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-control bg-line/60" />
            ))}
          </div>
        </div>
        <div className="gutter lg:p-0">
          <div className="h-[44vh] min-h-72 rounded-panel bg-line lg:h-full lg:rounded-none" />
        </div>
      </div>
    </AreaShell>
  );
}
