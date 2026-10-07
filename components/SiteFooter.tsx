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

  const lenke = "rounded-sm py-1 underline-offset-3 hover:text-ink hover:underline";
  return (
    <footer className="border-t border-line">
      <div className="gutter mx-auto flex w-full max-w-[104rem] flex-wrap items-center justify-between gap-x-8 gap-y-2 py-6 text-sm text-subtle">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-muted">NaboRadar</span>
          <span aria-hidden="true">·</span>
          <a href={`mailto:${KONTAKT_EPOST}`} className={`${lenke} break-all`}>
            {KONTAKT_EPOST}
          </a>
          <span aria-hidden="true">·</span>
          <Link href="/personvern" className={lenke}>
            Personvern
          </Link>
        </p>
        <p>Stedsdata og kart © Kartverket</p>
      </div>
    </footer>
  );
}
