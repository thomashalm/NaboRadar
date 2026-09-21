import { AreaShell } from "@/components/area/AreaShell";

export default function EventLoading() {
  return (
    <AreaShell>
      <div className="mx-auto max-w-3xl animate-pulse px-5 pt-12 sm:px-8" role="status" aria-label="Laster saken">
        <div className="h-4 w-28 rounded bg-line" />
        <div className="mt-4 h-10 w-3/4 rounded-lg bg-line" />
        <div className="mt-3 h-5 w-1/2 rounded bg-line" />
        <div className="mt-8 h-[46vh] rounded-2xl bg-line sm:h-[26rem]" />
      </div>
    </AreaShell>
  );
}
