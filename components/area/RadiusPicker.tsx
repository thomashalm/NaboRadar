"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRadius } from "@/lib/format";
import { RADIUS_OPTIONS_M } from "@/lib/geo/constants";

interface RadiusPickerProps {
  radius: number;
  hrefFor: (radius: number) => string;
  /** Navigasjon i en transition (feeden viser lastetilstand, kartet beholdes). */
  onNavigate: (href: string) => void;
  /** Sann mens en navigasjon pågår. Brukes bare når det var radiusvalget som startet den. */
  pending?: boolean;
}

/**
 * Radiusvalg som ekte lenker (delbare, fungerer uten JS), men navigerer i en transition.
 *
 * På mobil er hele poenget at trykket skal føles registrert med én gang. Derfor flyttes
 * den valgte tilstanden optimistisk til knappen brukeren trykket på, før data og kart er
 * oppdatert, og «Oppdaterer …» forteller at noe faktisk skjer i mellomtiden.
 */
export function RadiusPicker({ radius, hrefFor, onNavigate, pending = false }: RadiusPickerProps) {
  const [tap, setTap] = useState<{ option: number; from: number } | null>(null);

  // Det optimistiske valget gjelder bare mens navigasjonen pågår og URL-en ennå ikke har
  // fått den nye radiusen. Da nullstiller det seg selv — både når navigasjonen lykkes og
  // når den avbrytes — uten at vi trenger å rydde i en effekt.
  const optimistic = tap !== null && pending && radius === tap.from ? tap.option : null;
  const selectedRadius = optimistic ?? radius;
  const busy = optimistic !== null;

  return (
    <nav aria-label="Velg radius" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ul className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-float">
        {RADIUS_OPTIONS_M.map((option) => {
          const selected = option === selectedRadius;
          const href = hrefFor(option);
          return (
            <li key={option}>
              <Link
                href={href}
                replace
                scroll={false}
                aria-current={selected ? "true" : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  if (option === selectedRadius) return;
                  setTap({ option, from: radius });
                  onNavigate(href);
                }}
                className={`flex h-12 min-w-[4.25rem] touch-manipulation items-center justify-center rounded-full px-4 text-[15px] font-semibold transition-transform duration-100 active:scale-[0.96] sm:h-11 sm:min-w-[4.5rem] ${
                  selected
                    ? "bg-ink text-white shadow-[0_1px_3px_rgb(21_23_27_/_0.25)]"
                    : "text-muted active:bg-line/70 sm:font-medium sm:hover:bg-canvas sm:hover:text-ink"
                }`}
              >
                {formatRadius(option)}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Vises bare når det var radiusvalget som startet navigasjonen — ikke ved sortering. */}
      {busy && (
        <p role="status" className="inline-flex items-center gap-2 text-[13px] font-medium text-muted">
          <span
            aria-hidden="true"
            className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink"
          />
          Oppdaterer …
        </p>
      )}
    </nav>
  );
}
