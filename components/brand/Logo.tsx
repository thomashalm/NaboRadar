import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-control text-[18px] font-semibold tracking-[-0.025em] text-ink"
    >
      {/* Søkepunktet og radien rundt — det samme kartet tegner. */}
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="var(--color-accent)" />
        <circle cx="12" cy="12" r="6.25" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.25" />
        <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
      </svg>
      NaboRadar
    </Link>
  );
}
