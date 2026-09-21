import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-lg text-[15px] font-semibold tracking-tight text-ink"
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="6" fill="none" stroke="var(--color-accent)" strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="2.5" fill="var(--color-accent)" />
      </svg>
      NaboRadar
    </Link>
  );
}
