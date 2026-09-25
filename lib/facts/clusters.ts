import {
  describeClusterToggle,
  describeGrunnforholdSummary,
  describeInfrastrukturSummary,
} from "./wording";
import { formatRadius } from "@/lib/format";
import type { AreaFact } from "@/types/area-feature";
import type { ClusterList, FactCluster } from "./queries";

/**
 * Grupper som bygges av ferdige fakta, ikke av databaserader.
 *
 * Grunnforhold og infrastruktur får kildene sine fra to hold: synkede data fra databasen og
 * direkte oppslag mot NVE. Delsvarene kommer hver for seg og til ulik tid, så gruppen kan
 * først settes sammen når begge er inne. Derfor bor byggingen her, i en ren modul begge sider
 * kan bruke, og ikke i spørrelaget.
 */

/** Hvor mange funn en liste viser bak utvideren. */
const CLUSTER_LIST_CAP = 30;
/** Hvor mange som vises uten å utvide. */
const CLUSTER_PREVIEW = 3;

const byRelevance = (a: AreaFact, b: AreaFact) =>
  Number(b.contains) - Number(a.contains) || (a.distanceM ?? 0) - (b.distanceM ?? 0);

interface ClusterListSpec {
  id: string;
  label: string;
  subtypes: readonly string[];
  ental: string;
  flertall: string;
}

/** Undertypene i «Infrastruktur». En ny type legges til her, ikke i UI-et. */
const INFRA_LISTS: readonly ClusterListSpec[] = [
  {
    id: "transformatorstasjoner",
    label: "Transformatorstasjoner",
    subtypes: ["transformatorstasjon"],
    ental: "transformatorstasjon",
    flertall: "transformatorstasjoner",
  },
  {
    id: "kraftlinjer",
    label: "Kraftlinjer",
    subtypes: ["kraftledning", "hoyspent_distribusjon"],
    ental: "kraftlinje",
    flertall: "kraftlinjer",
  },
];

/**
 * «Infrastruktur» som én kompakt gruppe. Alnabru har 52 registreringer innen 3 km; som
 * enkeltkort fylte de siden.
 */
export function infrastrukturCluster(facts: AreaFact[], radiusM: number): FactCluster | null {
  const sortert = [...facts].sort(
    (a, b) => Number(b.contains) - Number(a.contains) || (a.distanceM ?? 0) - (b.distanceM ?? 0),
  );
  if (sortert.length === 0) return null;

  const lists: ClusterList[] = INFRA_LISTS.flatMap((spec) => {
    const treff = sortert.filter((fact) => spec.subtypes.includes(fact.subtype));
    if (treff.length === 0) return [];
    const items = treff.slice(0, CLUSTER_LIST_CAP).map((fact) => ({
      id: fact.id,
      title: fact.headline,
      distanceLabel: fact.distanceLabel,
      // Detaljlinjen fra formuleringsregisteret: spenning når kilden oppgir en, og netteier.
      subtitle: fact.details.filter(Boolean).join(" · ") || spec.label,
      contains: fact.contains,
      href: fact.link?.href ?? null,
    }));
    return [
      {
        id: spec.id,
        label: spec.label,
        toggleLabel:
          treff.length > CLUSTER_PREVIEW
            ? describeClusterToggle({ flertall: spec.flertall, vist: items.length, total: treff.length })
            : null,
        items,
        previewCount: CLUSTER_PREVIEW,
        total: treff.length,
      },
    ];
  });

  // Undertypene har hvert sitt forbehold. Vi viser dem for de typene som faktisk er med.
  const caveats = [...new Set(sortert.flatMap((fact) => (fact.caveat ? [fact.caveat] : [])))];
  const kilder = [...new Set(sortert.map((fact) => fact.sourceName))];

  return {
    sectionId: "infrastruktur",
    id: "infrastruktur",
    label: "Infrastruktur",
    summary: describeInfrastrukturSummary({ total: sortert.length, radiusLabel: formatRadius(radiusM) }),
    facts: [],
    lists,
    overview: null,
    caveat: caveats.join(" ") || null,
    sourceName: kilder.join(" · "),
  };
}

/**
 * «Grunnforhold» som én kompakt gruppe.
 *
 * Kortene her er teksttunge fordi kvikkleire krever presisjon: aktsomhetsområde er ikke det
 * samme som kartlagt sone, og mulig kvikkleire er ikke det samme som påvist. Standardvisningen
 * er derfor kort, mens sikkerhetsfaktor, undersøkelsesnivå og forbehold ligger under
 * «Detaljer» på hvert kort — ordlyden er den samme, den er bare flyttet.
 */
export function grunnforholdCluster(facts: AreaFact[], radiusM: number): FactCluster | null {
  const sortert = [...facts].sort(byRelevance);
  if (sortert.length === 0) return null;

  const summary = describeGrunnforholdSummary({
    aktsomhetVedPunkt: sortert.some((fact) => fact.subtype === "kvikkleire_aktsomhet"),
    utredetVedPunkt: sortert.some((fact) => fact.subtype === "kvikkleire_utredet_uten_fare"),
    soneVedPunkt: sortert.some((fact) => fact.subtype === "kvikkleire_sone" && fact.contains),
    soner: sortert.filter((fact) => fact.subtype === "kvikkleire_sone").length,
    radiusLabel: formatRadius(radiusM),
  });

  const forside = sortert.slice(0, CLUSTER_PREVIEW);
  const kilder = [...new Set(sortert.map((fact) => fact.sourceName))];

  return {
    sectionId: "grunnforhold",
    id: "grunnforhold",
    label: "Grunnforhold",
    summary,
    facts: forside,
    lists: [],
    overview:
      sortert.length > forside.length
        ? {
            sectionId: "grunnforhold",
            toggleLabel: "Se alle funn",
            total: sortert.length,
            noAttentionNote: null,
            headline: summary,
            details: [],
            caveat: null,
            sourceName: kilder.join(" · "),
            items: sortert.map((fact) => ({
              id: fact.id,
              title: fact.headline,
              distanceLabel: fact.distanceLabel,
              subtitle: fact.details[0] ?? "Grunnforhold",
              contains: fact.contains,
              href: fact.link?.href ?? null,
            })),
          }
        : null,
    caveat: null,
    sourceName: kilder.join(" · "),
  };
}

/**
 * «Støy» som kompakt gruppe.
 *
 * Støyfunn gjelder nesten alltid søkepunktet selv — du står i sonen eller ikke — og
 * forklaringen om at dette er en modellberegning og ikke en måling er like lang som selve
 * funnet. Standardvisningen er derfor to linjer: hva som er beregnet, og hvor. Metode,
 * kartleggingsår, forbehold og kilde ligger bak utvideren, med samme ordlyd som før.
 */
export function stoyCluster(facts: AreaFact[], radiusM: number): FactCluster | null {
  const sortert = [...facts].sort(byRelevance);
  if (sortert.length === 0) return null;

  const kilder = [...new Set(sortert.map((fact) => fact.sourceName))];
  const forste = sortert[0]!;
  const flere = sortert.length > 1;

  // Kompaktformen kommer fra formuleringsregisteret. Mangler den — en ny støytype som ikke
  // har fått kort form ennå — bruker vi den fulle overskriften i stedet for å finne på noe.
  const kort = forste.compact;

  return {
    sectionId: "stoy",
    id: "stoy",
    label: flere
      ? `${sortert.length} støykilder ${forste.contains ? "ved søkepunktet" : `innen ${formatRadius(radiusM)}`}`
      : (kort?.headline ?? forste.headline),
    summary: flere
      ? "Modellberegnet, ikke målt ved boligen"
      : (kort?.context ?? forste.distanceLabel),
    facts: sortert,
    lists: [],
    overview: null,
    caveat: null,
    sourceName: kilder.join(" · "),
  };
}

