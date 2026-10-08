"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerVises, KONTAKT_EPOST } from "@/lib/site";

/**
 * Felles bunntekst for de offentlige sidene: kontakt, personvern og Kartverket-krediteringen.
 * Ligger i rot-layouten, så ingen side kan glemme den; stien avgjør om den vises.
 */
export function SiteFooter() {
  if (!footerVises(usePathname() ?? "/")) return null;

  const lenke = "rounded-sm py-1 underline-offset-3 hover:text-accent hover:underline";
  return (
    <footer className="border-t border-line bg-surface">
      <div className="gutter mx-auto flex w-full max-w-[100rem] flex-wrap items-start justify-between gap-x-10 gap-y-3 py-5 text-sm text-subtle">
        <div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">NaboRadar</span>
            <span aria-hidden="true">·</span>
            <a href={`mailto:${KONTAKT_EPOST}`} className={`${lenke} break-all`}>
              {KONTAKT_EPOST}
            </a>
            <span aria-hidden="true">·</span>
            <Link href="/personvern" className={lenke}>
              Personvern
            </Link>
          </p>
        </div>
        <p className="max-w-md sm:text-right">
          Offentlige data fra norske myndigheter. Kilden står ved hvert funn.
          <span className="block">Stedsdata og kart © Kartverket</span>
        </p>
      </div>
    </footer>
  );
}
