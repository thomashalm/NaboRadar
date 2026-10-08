import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/**
 * Offentlig topplinje. Logo, og de to spesialverktøyene som alltid finnes.
 *
 * Bevisst nesten tom: adressesøket er produktets viktigste handling, og det står i innholdet —
 * stort på forsiden, som «Endre sted» på resultatsiden. Hyttekartet lenkes fra forsiden, der vi
 * vet om kategorien er publisert.
 */
const VERKTOY = [
  ["/skolekrets", "Skolekrets"],
  ["/tilfluktsrom", "Tilfluktsrom"],
] as const;

export function SiteHeader({ sticky = false }: { sticky?: boolean }) {
  return (
    <header
      className={`h-16 border-b border-line ${sticky ? "sticky top-0 z-40 bg-canvas/90 backdrop-blur" : ""}`}
    >
      <div className="gutter flex h-full items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Verktøy" className="hidden items-center gap-1 sm:flex">
          {VERKTOY.map(([href, tekst]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-10 items-center rounded-control px-3 text-sm text-subtle hover:bg-accent-tint hover:text-accent"
            >
              {tekst}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
