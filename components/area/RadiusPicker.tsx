"use client";

import Link from "next/link";
import { formatRadius } from "@/lib/format";
import { RADIUS_OPTIONS_M } from "@/lib/geo/constants";

interface RadiusPickerProps {
  radius: number;
  hrefFor: (radius: number) => string;
  /** Navigasjon i en transition (feeden viser lastetilstand, kartet beholdes). */
  onNavigate: (href: string) => void;
}

/** Radiusvalg som ekte lenker (delbare, fungerer uten JS), men navigerer i en transition. */
export function RadiusPicker({ radius, hrefFor, onNavigate }: RadiusPickerProps) {
  return (
    <nav aria-label="Velg radius">
      <ul className="inline-flex rounded-full border border-line bg-surface p-1 shadow-float">
        {RADIUS_OPTIONS_M.map((option) => {
          const selected = option === radius;
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
                  if (!selected) onNavigate(href);
                }}
                className={`flex h-11 min-w-[3.75rem] items-center justify-center rounded-full px-3 text-[15px] font-medium transition-colors sm:min-w-[4.5rem] sm:px-4 ${
                  selected ? "bg-ink text-white" : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {formatRadius(option)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
