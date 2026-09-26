"use client";

import Link from "next/link";
import { useMapSelection } from "@/components/area/map-selection";
import {
  CATEGORY_SHORT,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  VERIFICATION_LABEL,
  type NearbyResearch,
} from "@/lib/admin/research-types";
import { formatDistance, formatRadius } from "@/lib/format";

/**
 * Interne research-funn nær søkepunktet.
 *
 * Kortene følger resten av resultatsiden: avstand først, så en metalinje, så teksten. Det er
 * bevisst — en operatør skal kunne lese offentlig og internt i samme blikk. Merkelappen
 * INTERN og den dempede rammen er det som skiller dem.
 *
 * Bare kategorier som faktisk har funn vises. Tomme kategorier er ikke informasjon her; det er
 * støy som skjuler de to radene som betyr noe.
 */

export function ResearchFunn({
  funn,
  radiusM,
}: {
  funn: NearbyResearch[];
  radiusM: number;
}) {
  if (funn.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
        Ingen interne funn innen {formatRadius(radiusM)}.{" "}
        <Link
          href="/admin/research"
          className="font-medium text-accent hover:underline"
        >
          Til research
        </Link>
      </p>
    );
  }

  // Kategorirekkefølgen følger nærmeste funn, ikke en fast liste: det operatøren står i nå
  // er det som ligger nærmest adressen.
  const grupper = new Map<string, NearbyResearch[]>();
  for (const f of [...funn].sort((a, b) => a.distance_m - b.distance_m)) {
    const liste = grupper.get(f.category);
    if (liste) liste.push(f);
    else grupper.set(f.category, [f]);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-[15px] font-medium text-ink">Research i området</h3>
        <span className="text-[13px] text-muted">
          {funn.length} {funn.length === 1 ? "funn" : "funn"} innen{" "}
          {formatRadius(radiusM)}
        </span>
      </div>

      {[...grupper].map(([kategori, iKategorien]) => (
        <section key={kategori} className="mt-5">
          <h4 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {CATEGORY_SHORT[kategori] ?? kategori}
          </h4>
          <ul className="mt-2 space-y-2">
            {iKategorien.map((f) => (
              <FunnKort key={f.id} funn={f} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FunnKort({ funn }: { funn: NearbyResearch }) {
  const { selectedId, select, selectable } = useMapSelection();
  const kanVelges = selectable.has(funn.id);
  const valgt = selectedId === funn.id;

  // To linjer, som i spesifikasjonen: avstand og hva det er over tittelen, vurderingen under.
  const over = `${formatDistance(funn.distance_m)} · ${CATEGORY_SHORT[funn.category] ?? funn.category}`;
  const under = [
    OPERATIONAL_LABEL[funn.operational_status],
    `${LEVEL_LABEL[funn.confidence].toUpperCase()} SIKKERHET`,
    `INTERESSE ${LEVEL_LABEL[funn.interest_level].toUpperCase()}`,
    `${funn.source_count} ${funn.source_count === 1 ? "kilde" : "kilder"}`,
    "INTERN",
  ].join(" · ");

  return (
    <li
      className={`relative rounded-2xl border border-dashed px-5 py-4 transition-colors ${
        valgt ? "border-accent bg-accent-soft" : "border-line-strong bg-surface"
      } ${kanVelges && !valgt ? "hover:border-ink/30" : ""}`}
    >
      {/*
        Hele kortet velger funnet i kartet. Knappen dekker kortet i stedet for å pakke innholdet,
        fordi kortet inneholder en lenke — en lenke inne i en knapp er ugyldig, og gir en
        trykkflate som gjør to ting. Slik blir det to tydelige tabstopp: velg, og åpne funnet.
      */}
      {kanVelges && (
        <button
          type="button"
          onClick={() => select(funn.id)}
          aria-pressed={valgt}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <span className="sr-only">Vis {funn.title} i kartet</span>
        </button>
      )}

      <div className="pointer-events-none relative">
        <p className="text-[12px] font-medium tracking-[0.04em] text-muted uppercase">
          {over}
        </p>
        <h5 className="mt-0.5 text-[17px] font-medium tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
          {funn.title}
        </h5>
        <p className="mt-0.5 text-[12px] font-medium tracking-[0.04em] text-muted uppercase">
          {under}
        </p>
        {funn.address && (
          <p className="mt-1 text-[15px] text-muted">{funn.address}</p>
        )}
        {funn.description && (
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            {funn.description}
          </p>
        )}
      </div>

      <p className="relative z-20 mt-2 text-[13px] text-muted">
        {VERIFICATION_LABEL[funn.verification_status]} ·{" "}
        <Link
          href={`/admin/research/${funn.id}`}
          className="font-medium text-accent hover:underline"
        >
          Åpne funnet
        </Link>
        {!kanVelges && <span className="ml-1">· uten kartpunkt</span>}
      </p>
    </li>
  );
}
