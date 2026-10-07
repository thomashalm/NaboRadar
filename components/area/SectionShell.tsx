/**
 * Rammen rundt én seksjon i resultatet: overskrift, eventuelt én kort linje, og innholdet.
 *
 * Seksjonen er ikke et kort. Innholdet er rader og utvidere, og kapittelet rundt (AreaFacts)
 * setter luften og skillelinjene mellom seksjonene, slik at rytmen er den samme hele veien ned.
 *
 * `data-section` forteller kapittelet rundt at det har innhold (se Chapter i AreaFacts).
 */
export function SectionShell({
  label,
  intro,
  id,
  hideLabel = false,
  children,
}: {
  label: string;
  /** Én kort linje. Lange forbehold og kildetekst hører hjemme bak en utvider. */
  intro?: string | null;
  id?: string;
  /** Innholdet bærer overskriften selv (en gruppe med navn). Seksjonen navngis da med aria-label. */
  hideLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={hideLabel ? undefined : id}
      aria-label={hideLabel ? label : undefined}
      data-section
    >
      {!hideLabel && (
        <h3 id={id} className="type-h3 text-ink">
          {label}
        </h3>
      )}
      {intro && <p className="type-meta mt-0.5">{intro}</p>}
      <div className={hideLabel ? "" : "mt-2"}>{children}</div>
    </section>
  );
}
