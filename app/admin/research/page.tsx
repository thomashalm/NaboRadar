import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/session";
import { listResearchItems } from "@/lib/admin/research";
import type { Level, ResearchItem, ReviewStateNavn, VerificationStatus } from "@/lib/admin/research-types";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { ResearchOversikt } from "@/components/admin/ResearchOversikt";
import { hentReviewMetrics } from "@/lib/admin/review";
import { Kildedekning } from "@/components/admin/Kildedekning";
import { getKildedekning } from "@/lib/admin/area-research";

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
 * Et arbeidsbord, ikke et dashboard: søk, noen få filtre og en sortering over en liste der hver
 * rad sier hva funnet er, hvor sikkert det er og hvor mange kilder som bærer det. Kommune,
 * kategori og sortering står framme; de seks andre filtrene ligger bak «Flere filtre».
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

  // Kildestatus og reviewtall hentes ved siden av funnene; feiler de, vises resten.
  const [dekning, metrics] = await Promise.all([
    getKildedekning(session.client).catch(() => null),
    hentReviewMetrics(session.client).catch(() => null),
  ]);
  const trengerReview = metrics ? metrics.due + metrics.overdue + metrics.needs_followup : null;

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
      <ResearchOversikt
        q={q}
        sort={sort}
        valgt={valgt}
        kommuner={kommuner}
        funn={funn}
        totalt={alle.length}
        trengerReview={trengerReview}
        forsinket={metrics?.overdue ?? 0}
      />

      <Kildedekning dekning={dekning} />
    </Ramme>
  );
}

function Ramme({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Drift</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Research</h1>
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

const INTERESSE_RANG: Record<Level, number> = { high: 0, medium: 1, low: 2 };
const REVIEW_RANG: Record<ReviewStateNavn, number> = {
  needs_followup: 0,
  overdue: 0,
  due: 1,
  due_soon: 2,
  blocked: 3,
  current: 4,
  no_review_needed: 5,
};
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
      return ut.sort((a, b) => (a.last_verified_at ?? "").localeCompare(b.last_verified_at ?? ""));
    case "review":
      // Køens egen rekkefølge hører hjemme i køen; her holder det å løfte det som er forfalt.
      return ut.sort(
        (a, b) =>
          REVIEW_RANG[a.review_state] - REVIEW_RANG[b.review_state] ||
          (a.next_review_at ?? "9999").localeCompare(b.next_review_at ?? "9999"),
      );
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

function første(verdi: string | string[] | undefined): string | undefined {
  const v = Array.isArray(verdi) ? verdi[0] : verdi;
  return v?.trim() || undefined;
}
