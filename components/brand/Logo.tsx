import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-control text-[17px] font-semibold tracking-[-0.02em] text-ink"
    >
      {/* Søkepunktet og radien rundt — det samme kartet tegner. */}
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10.75" fill="var(--color-accent-soft)" stroke="var(--color-accent)" strokeOpacity="0.35" strokeWidth="1.25" />
        <circle cx="12" cy="12" r="5.75" fill="none" stroke="var(--color-accent)" strokeOpacity="0.55" strokeWidth="1.25" />
        <circle cx="12" cy="12" r="2.5" fill="var(--color-accent)" />
      </svg>
      NaboRadar
    </Link>
  );
}
