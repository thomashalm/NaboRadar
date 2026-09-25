import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/session";
import { listResearchItems } from "@/lib/admin/research";
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
  type Level,
  type ResearchItem,
  type VerificationStatus,
} from "@/lib/admin/research-types";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";

export const metadata: Metadata = { title: "Research", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Feltene det kan filtreres på, og hvor de leses fra i en rad. */
const FILTRE = [
  { navn: "kommune", label: "Kommune", felt: (i: ResearchItem) => i.municipality },
  { navn: "kategori", label: "Kategori", felt: (i: ResearchItem) => i.category },
  { navn: "type", label: "Type", felt: (i: ResearchItem) => i.item_type },
  { navn: "status", label: "Verifisering", felt: (i: ResearchItem) => i.verification_status },
  { navn: "drift", label: "Driftsstatus", felt: (i: ResearchItem) => i.operational_status },
  { navn: "folsomhet", label: "Følsomhet", felt: (i: ResearchItem) => i.sensitivity },
  { navn: "sikkerhet", label: "Sikkerhet", felt: (i: ResearchItem) => i.confidence },
  { navn: "interesse", label: "Interesse", felt: (i: ResearchItem) => i.interest_level },
] as const;

/**
 * Research-oversikten.
 *
 * Et arbeidsbord, ikke et dashboard: søk, filtre og en sortering over en liste der hver rad
 * sier hva funnet er, hvor sikkert det er og hvor mange kilder som bærer det.
 *
 * Søket går mot databasen — det dekker også kildenavn, så et søk på «Enhetsregisteret» finner
 * funnene som hviler på det. Filtrering og sortering skjer her: volumet er lavt, og én spørring
 * pluss URL-parametre er billigere enn åtte kombinerbare databasefiltre.
 *
 * Ingenting herfra publiseres. Skal et funn ut, må det gjennom den vanlige provider-veien.
 */
export default async function ResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Research" state={session.state} />;

  const params = await searchParams;
  const q = første(params.q);
  const sort = første(params.sort) ?? "oppdatert";
  const valgt = Object.fromEntries(FILTRE.map((f) => [f.navn, første(params[f.navn])]));

  let alle: ResearchItem[];
  try {
    alle = await listResearchItems(session.client, q);
  } catch (error) {
    return (
      <Ramme>
        <p className="mt-6 rounded-2xl bg-danger-soft px-5 py-4 text-[15px] text-danger">
          Kunne ikke hente research: {error instanceof Error ? error.message : "ukjent feil"}
        </p>
      </Ramme>
    );
  }

  const funn = sorter(
    alle.filter((i) => FILTRE.every((f) => !valgt[f.navn] || f.felt(i) === valgt[f.navn])),
    sort,
  );

  // Kommuner kommer fra dataene, ikke fra en liste i koden: det er de vi faktisk har funn i.
  const kommuner = [...new Set(alle.map((i) => i.municipality).filter((m): m is string => !!m))].sort((a, b) =>
    a.localeCompare(b, "nb"),
  );

  return (
    <Ramme>
      <form className="mt-6" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søk i tittel, beskrivelse, adresse, kommune, sted, kategori, notater og kildenavn"
          className="w-full rounded-full border border-line bg-surface px-5 py-3 text-[15px] text-ink outline-none focus:border-accent"
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Velg navn="kommune" label="Kommune" verdi={valgt.kommune} valg={kommuner.map((k) => ({ verdi: k, label: k }))} />
          <Velg
            navn="kategori"
            label="Kategori"
            verdi={valgt.kategori}
            valg={RESEARCH_CATEGORIES.map((c) => ({ verdi: c, label: CATEGORY_SHORT[c] ?? c }))}
          />
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
          <Velg
            navn="sort"
            label="Sortering"
            verdi={sort === "oppdatert" ? undefined : sort}
            alleLabel="sist endret"
            valg={[
              { verdi: "opprettet", label: "nyest først" },
              { verdi: "sjekket", label: "lengst siden sjekk" },
              { verdi: "interesse", label: "interesse" },
              { verdi: "kilder", label: "flest kilder" },
              { verdi: "tittel", label: "tittel" },
            ]}
          />
        </div>

        <div className="mt-3 flex items-center gap-4">
          <button type="submit" className="rounded-full bg-ink px-5 py-2 text-[15px] font-medium text-surface">
            Bruk
          </button>
          <Link href="/admin/research" className="text-[15px] text-muted hover:underline">
            Nullstill
          </Link>
        </div>
      </form>

      <p className="mt-6 text-[13px] text-muted">
        {funn.length} av {alle.length} funn
      </p>

      {funn.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[15px] text-muted">
          {alle.length === 0 ? "Ingen research lagt inn ennå." : "Ingen funn med disse kriteriene."}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {funn.map((item) => (
            <Rad key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Ramme>
  );
}

function Ramme({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Drift</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Research</h1>
        </div>
        <Link
          href="/admin/research/nytt"
          className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-surface"
        >
          Nytt funn
        </Link>
      </div>
      <p className="mt-3 text-[15px] text-muted">
        Interne arbeidsdata. Ingenting her vises for brukerne, og ingenting publiseres automatisk.
      </p>
      {children}
      <Link href="/admin" className="mt-10 inline-block text-[15px] font-medium text-accent hover:underline">
        Til driftssiden
      </Link>
    </main>
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
      <p className="mt-2 text-[13px] text-muted">
        {VERIFICATION_LABEL[item.verification_status]} · sist sjekket{" "}
        {item.last_checked_at ? dato(item.last_checked_at) : "aldri"}
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

const INTERESSE_RANG: Record<Level, number> = { high: 0, medium: 1, low: 2 };
const STATUS_RANG: Record<VerificationStatus, number> = {
  verified_public_source: 0,
  partially_verified: 1,
  unverified: 2,
  investigated_not_confirmed: 3,
  rejected: 4,
  archived: 5,
};

function sorter(funn: ResearchItem[], sort: string): ResearchItem[] {
  const ut = [...funn];
  switch (sort) {
    case "opprettet":
      return ut.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "sjekket":
      // Aldri sjekket er det som trenger en sjekk mest, så det ligger først.
      return ut.sort((a, b) => (a.last_checked_at ?? "").localeCompare(b.last_checked_at ?? ""));
    case "interesse":
      // Innen samme interessenivå: det best verifiserte først — det er det som er klart å bruke.
      return ut.sort(
        (a, b) =>
          INTERESSE_RANG[a.interest_level] - INTERESSE_RANG[b.interest_level] ||
          STATUS_RANG[a.verification_status] - STATUS_RANG[b.verification_status],
      );
    case "kilder":
      return ut.sort((a, b) => b.source_count - a.source_count);
    case "tittel":
      return ut.sort((a, b) => a.title.localeCompare(b.title, "nb"));
    default:
      return ut.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}

function dato(verdi: string): string {
  return new Date(verdi).toLocaleDateString("nb-NO", { dateStyle: "medium" });
}

function første(verdi: string | string[] | undefined): string | undefined {
  const v = Array.isArray(verdi) ? verdi[0] : verdi;
  return v?.trim() || undefined;
}
