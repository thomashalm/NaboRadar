/**
 * Rammen rundt én seksjon i resultatet.
 *
 * Alle seksjonene følger samme mønster: overskrift, eventuelt én kort sekundærlinje, og så
 * innholdet — et kompakt kort, en gruppe eller en statuslinje, med detaljene bak en utvider.
 * Den lå tidligere som to nesten like varianter i AreaFacts og EventFeed, og seksjonene
 * drev fra hverandre etter hvert som de fikk hvert sitt innhold.
 *
 * Avstandene bor her, ett sted, slik at rytmen er den samme hele veien ned.
 */
export function SectionShell({
  label,
  intro,
  id,
  children,
}: {
  label: string;
  /** Én kort linje. Lange forbehold og kildetekst hører hjemme bak en utvider. */
  intro?: string | null;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        {label}
      </h3>
      {intro && <p className="mt-1 text-[13px] text-muted">{intro}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}
