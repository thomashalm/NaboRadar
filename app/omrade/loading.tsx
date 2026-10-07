import { AreaShell } from "@/components/area/AreaShell";

/** Samme form som den ferdige siden: adresse og oppsummering til venstre, kartet til høyre. */
export default function AreaLoading() {
  return (
    <AreaShell>
      <div
        className="mx-auto w-full max-w-[104rem] animate-pulse lg:grid lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,42rem)_minmax(0,1fr)]"
        role="status"
        aria-label="Laster området"
      >
        <div className="gutter pt-8 pb-8 lg:pt-12">
          <div className="h-3.5 w-24 rounded-full bg-line" />
          <div className="mt-3 h-9 w-64 max-w-full rounded-control bg-line" />
          <div className="mt-3 h-5 w-32 rounded-full bg-line" />
          <div className="mt-6 h-12 w-56 rounded-control bg-line" />
          <div className="mt-10 space-y-5 border-t border-line pt-6">
            <div className="h-5 w-48 rounded-full bg-line" />
            <div className="h-3 w-full rounded-full bg-line" />
            <div className="h-3 w-5/6 rounded-full bg-line" />
            <div className="h-3 w-2/3 rounded-full bg-line" />
          </div>
        </div>
        <div className="gutter lg:h-[calc(100dvh-4rem)] lg:py-6 lg:pr-6 lg:pl-0">
          <div className="h-[56vh] min-h-80 rounded-panel bg-line lg:h-full" />
        </div>
      </div>
    </AreaShell>
  );
}
