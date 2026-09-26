"use client";

import Link from "next/link";
import { useMapSelection } from "@/components/area/map-selection";
import { grupperFunn } from "@/lib/admin/research-sort";
import {
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  VERIFICATION_LABEL,
  type NearbyResearch,
} from "@/lib/admin/research-types";
import { formatDistance, formatRadius } from "@/lib/format";

/**
 * Interne research-funn, øverst i admin-adressevisningen.
 *
 * Kortene er kompakte med vilje: et søk gir ofte ti–femten funn, og de skal kunne skannes. Det
 * som står ute er det som avgjør om man vil åpne kortet — hva det er, hvor det er, hvor
 * interessant og hvor sikkert det er. Alt annet ligger bak «Detaljer».
 *
 * Tekniske databaseverdier vises ikke. «Ukjent status» og «manuelt opphav» fyller linjen uten å
 * si noe; de hører hjemme i detaljene eller i research-oversikten.
 */

export function ResearchFunn({ funn, radiusM }: { funn: NearbyResearch[]; radiusM: number }) {
  if (funn.length === 0) {
    return (
      <p className="mt-3 text-[13px] text-muted">
        Ingen interne funn innen {formatRadius(radiusM)}.{" "}
        <Link href="/admin/research" className="font-medium text-accent hover:underline">
          Til research
        </Link>
      </p>
    );
  }

  const grupper = grupperFunn(funn);

  return (
    <div className="mt-3 flex flex-col gap-5">
      {grupper.map((gruppe) => (
        <section key={gruppe.kategori}>
          <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {gruppe.kortNavn}
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {gruppe.funn.map((f) => (
              <FunnKort key={f.id} funn={f} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * «Omfatter valgt sted» når søkepunktet ligger på funnet, ellers avstanden.
 *
 * Kategorien står i gruppeoverskriften rett over, og gjentas ikke her — samme regel som på den
 * offentlige siden. Gjentakelsen kostet en linjebrekking på hvert eneste kort på mobil.
 */
function stedslinje(funn: NearbyResearch): string {
  return (funn.distance_m < 1 ? "Omfatter valgt sted" : formatDistance(funn.distance_m)).toUpperCase();
}

function FunnKort({ funn }: { funn: NearbyResearch }) {
  const { selectedId, select, selectable } = useMapSelection();
  const kanVelges = selectable.has(funn.id);
  const valgt = selectedId === funn.id;

  const vurdering = [
    `${LEVEL_LABEL[funn.interest_level]} interesse`,
    `${LEVEL_LABEL[funn.confidence]} sikkerhet`,
    `${funn.source_count} ${funn.source_count === 1 ? "kilde" : "kilder"}`,
    "intern",
  ]
    .join(" · ")
    .toUpperCase();

  const topp = (
    <>
      <p className="text-[11px] font-semibold tracking-[0.06em] text-muted">{stedslinje(funn)}</p>
      <p className="mt-0.5 text-[15px] leading-snug font-medium text-ink [overflow-wrap:anywhere]">
        {funn.title}
      </p>
      {funn.address && <p className="text-[13px] text-muted [overflow-wrap:anywhere]">{funn.address}</p>}
      <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] text-muted">{vurdering}</p>
    </>
  );

  return (
    <li
      className={`rounded-xl border transition-colors ${
        valgt ? "border-accent bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      {/*
        Kartvalg og «Detaljer» er to ulike handlinger, og har derfor hver sin kontroll. Å slå dem
        sammen ville betydd at et klikk i kartet åpnet alle kortene, eller at man ikke kunne lese
        detaljene uten å flytte kartet.
      */}
      {kanVelges ? (
        <button
          type="button"
          onClick={() => select(funn.id)}
          aria-pressed={valgt}
          className="w-full cursor-pointer px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          {topp}
          <span className="sr-only">Vis {funn.title} i kartet</span>
        </button>
      ) : (
        <div className="px-4 py-3">{topp}</div>
      )}

      <details className="border-t border-line/70">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-[13px] font-medium text-muted hover:text-ink">
          Detaljer
        </summary>
        <div className="px-4 pt-1 pb-3">
          {funn.description && (
            <p className="text-[14px] leading-relaxed text-ink [overflow-wrap:anywhere]">{funn.description}</p>
          )}
          {funn.why_interesting && (
            <p className="mt-2 border-l-2 border-line-strong pl-3 text-[14px] leading-relaxed text-ink">
              {funn.why_interesting}
            </p>
          )}
          <dl className="mt-3 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
            <Rad navn="Verifisering" verdi={VERIFICATION_LABEL[funn.verification_status]} />
            {/* «Ukjent status» er ikke informasjon, og utelates. */}
            {funn.operational_status !== "unknown" && (
              <Rad navn="Driftsstatus" verdi={OPERATIONAL_LABEL[funn.operational_status]} />
            )}
            <Rad navn="Sikkerhet" verdi={LEVEL_LABEL[funn.confidence]} />
            <Rad navn="Interesse" verdi={LEVEL_LABEL[funn.interest_level]} />
            <Rad navn="Kilder" verdi={String(funn.source_count)} />
            {funn.public_candidate && <Rad navn="Status" verdi="Kandidat for offentlig visning" />}
          </dl>
          {funn.notes && <p className="mt-3 text-[13px] leading-relaxed text-muted">{funn.notes}</p>}
          <Link
            href={`/admin/research/${funn.id}`}
            className="mt-3 inline-flex h-9 items-center text-[14px] font-medium text-accent hover:underline"
          >
            Åpne funnet →
          </Link>
        </div>
      </details>
    </li>
  );
}

function Rad({ navn, verdi }: { navn: string; verdi: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line/60 py-1">
      <dt className="text-muted">{navn}</dt>
      <dd className="text-right text-ink">{verdi}</dd>
    </div>
  );
}
