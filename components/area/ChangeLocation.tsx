"use client";

import { useEffect, useRef, useState } from "react";
import { SearchBox } from "@/components/search/SearchBox";
import type { AreaBasePath } from "@/lib/area-params";

/** «Endre sted»: viser søkefeltet på resultatsiden. Valgt radius følger med til nytt sted. */
export function ChangeLocation({
  radius,
  onNavigate,
  basePath,
}: {
  radius: number;
  onNavigate?: (href: string) => void;
  basePath?: AreaBasePath;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Returner fokus til knappen når søket lukkes.
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!open) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-full px-2.5 text-[15px] sm:px-3 font-medium text-accent hover:bg-accent-soft"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Endre sted
      </button>
    );
  }

  return (
    <div
      className="w-full"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !(event.target as HTMLInputElement).value) setOpen(false);
      }}
    >
      <SearchBox radius={radius} autoFocus onSelected={() => setOpen(false)} onNavigate={onNavigate} basePath={basePath} />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 h-10 rounded-full px-3 text-sm font-medium text-muted hover:text-ink"
      >
        Avbryt
      </button>
    </div>
  );
}
