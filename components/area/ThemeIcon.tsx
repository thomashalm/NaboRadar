import type { CSSProperties } from "react";

/**
 * Temaikonet: strekikon på 20 px (strek 1,6) i en avrundet flate på 36 px.
 *
 * Fargen er temaets, satt som `--tema` på en forelder eller via `color`. Flaten er samme farge i
 * 12 % — eller hel farge med hvitt ikon når temaet er valgt. Ikonet sier hvilket tema det er,
 * aldri om funnet er bra eller dårlig.
 */
const IKONER: Record<string, React.ReactNode> = {
  stoy: (
    <>
      <path d="M4 9.5v5h3l4 3.5v-12L7 9.5H4Z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" />
    </>
  ),
  naturfare: <path d="m3 18 6-10 3.5 5.5L15 10l6 8H3Z" />,
  planer: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6v-17Z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  skole: (
    <>
      <path d="m2.5 9.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 12v4.5c1.5 1.3 3.4 2 5.5 2s4-.7 5.5-2V12" />
    </>
  ),
  infrastruktur: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />,
  helse: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  servering: (
    <>
      <path d="M7 3.5v6a2.5 2.5 0 0 0 5 0v-6M9.5 3.5v17" />
      <path d="M17 20.5v-17c-2 1.5-3 4-3 7.5h3" />
    </>
  ),
  anlegg: (
    <>
      <path d="M3.5 20.5v-9l5 3v-3l5 3V6.5h3l1 14h-14Z" />
    </>
  ),
  friluft: (
    <>
      <path d="m12 3.5-5 7h2.5l-4 6h13l-4-6H17l-5-7Z" />
      <path d="M12 16.5v4" />
    </>
  ),
  tilfluktsrom: <path d="M12 3.5 5 6v5.5c0 4.3 2.8 7.3 7 9 4.2-1.7 7-4.7 7-9V6l-7-2.5Z" />,
  annet: <circle cx="12" cy="12" r="3.5" />,
};

export function ThemeIcon({
  icon,
  color,
  selected = false,
  muted = false,
  size = "md",
}: {
  icon: string;
  /** Temafargen. Utelates når en forelder har satt `--tema`. */
  color?: string;
  selected?: boolean;
  /** Mens temaet lastes. */
  muted?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      style={color ? ({ "--tema": color } as CSSProperties) : undefined}
      className={`flex shrink-0 items-center justify-center rounded-control ${size === "lg" ? "size-11" : "size-9"} ${
        muted
          ? "bg-sunken text-subtle"
          : selected
            ? "bg-(--tema) text-white"
            : "bg-[color-mix(in_srgb,var(--tema)_12%,white)] text-(--tema)"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={size === "lg" ? "size-6" : "size-5"}
      >
        {IKONER[icon] ?? IKONER.annet}
      </svg>
    </span>
  );
}
