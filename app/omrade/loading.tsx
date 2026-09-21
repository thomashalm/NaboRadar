import { AreaShell } from "@/components/area/AreaShell";

export default function AreaLoading() {
  return (
    <AreaShell>
      <div
        className="animate-pulse lg:grid lg:grid-cols-[minmax(24rem,30rem)_1fr]"
        role="status"
        aria-label="Laster området"
      >
        <div className="px-5 pt-7 sm:px-8 lg:px-10 lg:pt-12">
          <div className="h-4 w-40 rounded bg-line" />
          <div className="mt-3 h-9 w-56 rounded-lg bg-line" />
          <div className="mt-6 h-12 w-64 rounded-full bg-line" />
        </div>
        <div className="mx-5 mt-6 h-[48vh] rounded-2xl bg-line sm:mx-8 lg:m-0 lg:h-[calc(100dvh-4rem)] lg:rounded-none" />
      </div>
    </AreaShell>
  );
}
