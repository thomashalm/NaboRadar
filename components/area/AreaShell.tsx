import { Logo } from "@/components/brand/Logo";

/** Felles ramme for /omrade: tynn topplinje, så innhold. Høyden brukes av sticky-kartet (4rem). */
export function AreaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 h-16 border-b border-line/70 bg-canvas/90 backdrop-blur">
        <div className="flex h-full items-center px-5 sm:px-8">
          <Logo />
        </div>
      </header>
      {children}
    </div>
  );
}
