import Link from "next/link";
import { ReviewMerke } from "@/components/admin/ReviewMerke";
import { antallAvanserte, flereFiltreLabel } from "@/lib/admin/research-filtre";
import {
  CATEGORY_SHORT,
  ITEM_TYPES,
  ITEM_TYPE_LABEL,
  LEVELS,
  LEVEL_LABEL,
  OPERATIONAL_LABEL,
  OPERATIONAL_STATUSES,
  RESEARCH_CATEGORIES,
  SENSITIVITIES,
  SENSITIVITY_LABEL,
  VERIFICATION_LABEL,
  VERIFICATION_STATUSES,
  type ResearchItem,
} from "@/lib/admin/research-types";
import { nårReview } from "@/lib/admin/review-types";

/**
 * Selve research-oversikten: søk, filtre, de tre inngangene og listen.
 *
 * Skilt ut fra siden (app/admin/research/page.tsx), som henter og filtrerer. Komponenten får
 * ferdige data og gjør ingen oppslag, så den kan vises og kontrolleres uten innlogging.
 *
 * Standardvisningen er bevisst liten: søk, kommune, kategori og sortering. De seks andre
 * filtrene ligger bak «Flere filtre». Ingen av dem er fjernet, og alle er vanlige URL-parametre.
 */
export function ResearchOversikt({
  q,
  sort,
  valgt,
  kommuner,
  funn,
  totalt,
  trengerReview,
  forsinket,
}: {
  q: string | undefined;
  sort: string;
  valgt: Record<string, string | undefined>;
  kommuner: string[];
  funn: ResearchItem[];
  totalt: number;
  /** Null når tallene ikke kunne hentes. */
  trengerReview: number | null;
  forsinket: number;
}) {
  const avanserte = antallAvanserte(valgt);
  return (
    <>
      <form className="mt-6" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søk i tittel, beskrivelse, adresse, kommune, sted, kategori, notater og kildenavn"
          className="w-full rounded-full border border-line bg-surface px-5 py-3 text-[15px] text-ink outline-none focus:border-accent"
        />

        {/* Alltid framme: det man faktisk avgrenser på til daglig. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Velg navn="kommune" label="Kommune" verdi={valgt.kommune} valg={kommuner.map((k) => ({ verdi: k, label: k }))} />
          <Velg
            navn="kategori"
            label="Kategori"
            verdi={valgt.kategori}
            valg={RESEARCH_CATEGORIES.map((c) => ({ verdi: c, label: CATEGORY_SHORT[c] ?? c }))}
          />
          <Velg
            navn="sort"
            label="Sortering"
            verdi={sort === "oppdatert" ? undefined : sort}
            alleLabel="sist endret"
            valg={[
              { verdi: "opprettet", label: "nyest først" },
              { verdi: "sjekket", label: "lengst siden verifisering" },
              { verdi: "review", label: "review-behov" },
              { verdi: "interesse", label: "interesse" },
              { verdi: "kilder", label: "flest kilder" },
              { verdi: "tittel", label: "tittel" },
            ]}
          />
        </div>

        {/*
          Resten ligger bak én utvider. Feltene er med i skjemaet også når den er lukket, så et
          aktivt filter forsvinner ikke ved neste søk. Er noe av det i bruk, står den åpen og
          sier hvor mange — et filter som virker uten å synes ville vært en felle.
        */}
        <details className="mt-3 rounded-xl border border-line bg-surface" open={avanserte > 0}>
          <summary className="cursor-pointer px-4 py-2.5 text-[15px] font-medium text-ink">{flereFiltreLabel(avanserte)}</summary>
          <div className="grid gap-3 border-t border-line px-4 pt-3 pb-4 sm:grid-cols-3">
            <Velg
              navn="type"
              label="Type"
              verdi={valgt.type}
              valg={ITEM_TYPES.map((t) => ({ verdi: t, label: ITEM_TYPE_LABEL[t] }))}
            />
            <Velg
              navn="status"
              label="Verifisering"
              verdi={valgt.status}
              valg={VERIFICATION_STATUSES.map((v) => ({ verdi: v, label: VERIFICATION_LABEL[v] }))}
            />
            <Velg
              navn="drift"
              label="Driftsstatus"
              verdi={valgt.drift}
              valg={OPERATIONAL_STATUSES.map((o) => ({ verdi: o, label: OPERATIONAL_LABEL[o] }))}
            />
            <Velg
              navn="folsomhet"
              label="Følsomhet"
              verdi={valgt.folsomhet}
              valg={SENSITIVITIES.map((s) => ({ verdi: s, label: SENSITIVITY_LABEL[s] }))}
            />
            <Velg
              navn="sikkerhet"
              label="Sikkerhet"
              verdi={valgt.sikkerhet}
              valg={LEVELS.map((l) => ({ verdi: l, label: LEVEL_LABEL[l] }))}
            />
            <Velg
              navn="interesse"
              label="Interesse"
              verdi={valgt.interesse}
              valg={LEVELS.map((l) => ({ verdi: l, label: LEVEL_LABEL[l] }))}
            />
          </div>
        </details>

        <div className="mt-3 flex items-center gap-4">
          <button type="submit" className="rounded-full bg-ink px-5 py-2 text-[15px] font-medium text-surface">
            Bruk
          </button>
          <Link href="/admin/research" className="text-[15px] text-muted hover:underline">
            Nullstill
          </Link>
        </div>
      </form>

      {/* De tre inngangene. Stables på mobil, slik at raden aldri gir sideveis scroll. */}
      <nav aria-label="Handlinger" className="mt-6 grid gap-3 sm:grid-cols-3">
        <Inngang href="/admin/research/utforsk" tittel="Utforsk data" tekst="Søk i NaboRadars kartlag og registre" />
        <Inngang
          href="/admin/research/review"
          tittel="Review-kø"
          tekst={
            trengerReview === null
              ? "Hva som bør undersøkes på nytt"
              : trengerReview === 0
                ? "Ingenting trenger review nå"
                : `${trengerReview} trenger review${forsinket ? `, ${forsinket} forsinket` : ""}`
          }
        />
        <Inngang href="/admin/research/nytt" tittel="Nytt funn" tekst="Legg inn et funn med kilder" primær />
      </nav>

      <p className="mt-5 text-[13px] text-muted">
        {funn.length} av {totalt} funn
      </p>

      {funn.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
          {totalt === 0 ? "Ingen research lagt inn ennå." : "Ingen funn med disse kriteriene."}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {funn.map((item) => (
            <Rad key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Én av de tre inngangene under filtrene: tittel, én linje om hva den er, og hele flaten som
 * lenke. Den primære er fylt; de to andre har samme form som kortene ellers i admin.
 */
function Inngang({ href, tittel, tekst, primær = false }: { href: string; tittel: string; tekst: string; primær?: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border px-4 py-3 ${
        primær ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink"
      }`}
    >
      <span className="block text-[15px] font-medium">{tittel}</span>
      <span className={`mt-0.5 block text-[13px] ${primær ? "text-surface/75" : "text-muted"}`}>{tekst}</span>
    </Link>
  );
}

function Rad({ item }: { item: ResearchItem }) {
  const meta = [
    ITEM_TYPE_LABEL[item.item_type],
    `${CATEGORY_SHORT[item.category] ?? item.category} / ${OPERATIONAL_LABEL[item.operational_status]}`,
    `${LEVEL_LABEL[item.confidence].toUpperCase()} SIKKERHET`,
    `INTERESSE ${LEVEL_LABEL[item.interest_level].toUpperCase()}`,
    `${item.source_count} ${item.source_count === 1 ? "kilde" : "kilder"}`,
    item.origin_type === "manual" ? "MANUELT" : (item.origin_provider ?? "IMPORTERT"),
  ];

  return (
    <li className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-[12px] font-medium tracking-[0.04em] text-muted uppercase">{meta.join(" · ")}</p>
      <h2 className="mt-1 text-[17px] font-medium tracking-[-0.01em]">
        <Link href={`/admin/research/${item.id}`} className="text-ink hover:underline [overflow-wrap:anywhere]">
          {item.title}
        </Link>
      </h2>
      <p className="mt-0.5 text-[15px] text-muted">
        {[item.address, item.city, item.municipality].filter(Boolean).join(", ") || "Uten adresse"}
        {item.latitude === null && " · uten koordinat"}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <ReviewMerke state={item.review_state} liten />
        <span>
          {nårReview(item.days_until_review, item.review_state)} · {VERIFICATION_LABEL[item.verification_status]} ·
          sist verifisert {item.last_verified_at ? dato(item.last_verified_at) : "aldri"}
        </span>
      </p>
    </li>
  );
}

function Velg({
  navn,
  label,
  verdi,
  valg,
  alleLabel = "alle",
}: {
  navn: string;
  label: string;
  verdi?: string;
  valg: { verdi: string; label: string }[];
  alleLabel?: string;
}) {
  return (
    <label htmlFor={navn} className="block">
      <span className="text-[13px] text-muted">{label}</span>
      <select
        id={navn}
        name={navn}
        defaultValue={verdi ?? ""}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-accent"
      >
        <option value="">{alleLabel}</option>
        {valg.map((v) => (
          <option key={v.verdi} value={v.verdi}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function dato(verdi: string): string {
  return new Date(verdi).toLocaleDateString("nb-NO", { dateStyle: "medium" });
}

