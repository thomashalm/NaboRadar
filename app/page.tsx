import { Logo } from "@/components/brand/Logo";
import { SearchBox } from "@/components/search/SearchBox";
import { DEFAULT_RADIUS_M } from "@/lib/geo/constants";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center px-5 pt-[12vh] pb-24 sm:px-8 sm:pt-[16vh]">
        <div className="w-full max-w-2xl">
          <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
            Hva skjer rundt deg?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted text-pretty sm:text-xl">
            Se planer, bygging og andre endringer rundt en adresse – uten å lete i kommunale systemer.
          </p>

          <div className="mt-10 sm:mt-12">
            <SearchBox radius={DEFAULT_RADIUS_M} size="large" />
          </div>

          <p className="mt-6 text-sm text-muted">Offentlige data. Forklart enkelt.</p>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-xs text-muted sm:px-8">
        Stedsdata og kart © Kartverket
      </footer>
    </div>
  );
}
