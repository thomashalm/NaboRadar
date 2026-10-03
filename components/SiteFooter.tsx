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

  const lenke = "rounded-sm py-1 underline-offset-2 hover:text-ink hover:underline";
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-xs leading-relaxed text-muted sm:px-8">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>NaboRadar</span>
        <span aria-hidden="true">·</span>
        <a href={`mailto:${KONTAKT_EPOST}`} className={`${lenke} break-all`}>
          {KONTAKT_EPOST}
        </a>
        <span aria-hidden="true">·</span>
        <Link href="/personvern" className={lenke}>
          Personvern
        </Link>
      </p>
      <p className="mt-1">Stedsdata og kart © Kartverket</p>
    </footer>
  );
}
