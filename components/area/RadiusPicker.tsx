import Link from "next/link";
import { buildAreaHref } from "@/lib/area-params";
import { formatRadius } from "@/lib/format";
import { RADIUS_OPTIONS_M } from "@/lib/geo/constants";

interface RadiusPickerProps {
  lat: number;
  lng: number;
  radius: number;
  label?: string;
}

/** Radiusvalg som lenker: delbar URL, fungerer uten JavaScript, og tilbake-knappen virker. */
export function RadiusPicker({ lat, lng, radius, label }: RadiusPickerProps) {
  return (
    <nav aria-label="Velg radius">
      <ul className="inline-flex rounded-full border border-line bg-surface p-1 shadow-float">
        {RADIUS_OPTIONS_M.map((option) => {
          const selected = option === radius;
          return (
            <li key={option}>
              <Link
                href={buildAreaHref({ lat, lng, radius: option, label })}
                replace
                scroll={false}
                aria-current={selected ? "true" : undefined}
                className={`flex h-11 min-w-[3.75rem] items-center justify-center rounded-full px-3 sm:min-w-[4.5rem] sm:px-4 text-[15px] font-medium transition-colors ${
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
