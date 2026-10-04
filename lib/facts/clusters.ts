import {
  describeClusterToggle,
  describeGrunnforholdSummary,
  describeInfrastrukturSummary,
  LDEN_FORKLARING,
  STOY_FORBEHOLD,
  STOY_KARTNIVA,
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
    summary: describeInfrastrukturSummary({
      total: sortert.length,
      radiusLabel: formatRadius(radiusM),
      deler: INFRA_LISTS.map((spec) => ({
        ental: spec.ental,
        flertall: spec.flertall,
        antall: sortert.filter((fact) => spec.subtypes.includes(fact.subtype)).length,
      })),
    }),
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

  // Kildens egne ord for de kartlagte sonene, i samme rekkefølge som radene.
  const SONELABEL: Record<string, string> = {
    flom_sone: "flomsone",
    skred_faresone: "skredfaresone",
    stormflo: "stormflonivå",
  };
  const AKTSOMHET = new Set(["flom_aktsomhet", "skred_jord_flom_aktsomhet", "skred_sno_stein_aktsomhet"]);
  // Hva aktsomhetsområdet gjelder, med kildens ord. Kvikkleire telles med når den er ved punktet.
  const AKTSOMHET_FOR: Record<string, string> = {
    kvikkleire_aktsomhet: "kvikkleireskred",
    flom_aktsomhet: "flom",
    skred_jord_flom_aktsomhet: "jord- og flomskred",
    skred_sno_stein_aktsomhet: "snø- og steinskred",
  };

  const summary = describeGrunnforholdSummary({
    aktsomhetVedPunkt: sortert.some((fact) => fact.subtype === "kvikkleire_aktsomhet"),
    utredetVedPunkt: sortert.some((fact) => fact.subtype === "kvikkleire_utredet_uten_fare"),
    soneVedPunkt: sortert.some((fact) => fact.subtype === "kvikkleire_sone" && fact.contains),
    soner: sortert.filter((fact) => fact.subtype === "kvikkleire_sone").length,
    radiusLabel: formatRadius(radiusM),
    kartlagteSoner: [
      ...new Set(
        sortert
          .filter((fact) => fact.contains && SONELABEL[fact.subtype] !== undefined)
          .map((fact) => SONELABEL[fact.subtype]!),
      ),
    ],
    aktsomhetsomrader: sortert.filter((fact) => AKTSOMHET.has(fact.subtype)).length,
    // Radonkortets egen overskrift, med «i området»: linjen står nå alene som første svar, og
    // skal si hvor aktsomheten gjelder.
    radonLinje: sortert.find((fact) => fact.subtype === "radon_aktsomhet")?.headline ?? null,
    aktsomhetTyper: [...new Set(sortert.flatMap((fact) => (AKTSOMHET_FOR[fact.subtype] ? [AKTSOMHET_FOR[fact.subtype]!] : [])))],
  });

  const forside = sortert.slice(0, CLUSTER_PREVIEW);
  const kilder = [...new Set(sortert.map((fact) => fact.sourceName))];

  return {
    sectionId: "grunnforhold",
    id: "grunnforhold",
    // Gruppen er hele seksjonen. Med seksjonens eget navn vises ingen egen merkelapp over
    // oppsummeringen (se ClusterDetails), og første synlige linje blir selve funnet. «Ved
    // søkepunktet» står i oppsummeringen der det gjelder.
    label: "Naturfare",
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
/** Støytypene som oppgir et Lden-intervall, til forskjell fra de rene sonekortene. */
const LDEN_SUBTYPER: ReadonlySet<string> = new Set(["stoy_strategisk_veg", "stoy_strategisk_bane"]);

export function stoyCluster(facts: AreaFact[], radiusM: number): FactCluster | null {
  const sortert = [...facts].sort(byRelevance);
  if (sortert.length === 0) return null;

  const kilder = [...new Set(sortert.map((fact) => fact.sourceName))];
  const forste = sortert[0]!;
  const flere = sortert.length > 1;

  // Kompaktformen kommer fra formuleringsregisteret. Mangler den — en ny støytype som ikke
  // har fått kort form ennå — bruker vi den fulle overskriften i stedet for å finne på noe.
  const kort = forste.compact;

  // Strategisk støykartlegging oppgir Lden-intervaller. For dem gjelder kartnivå-forbeholdet og
  // Lden-forklaringen, én gang i gruppen. Rene T-1442-sonekort (støyvarsel veg, fly) er uendret.
  const harLden = sortert.some((fact) => LDEN_SUBTYPER.has(fact.subtype));
  const forbehold = harLden ? STOY_KARTNIVA : STOY_FORBEHOLD;

  return {
    sectionId: "stoy",
    id: "stoy",
    label: flere
      ? `${sortert.length} støykilder ${forste.contains ? "ved søkepunktet" : `innen ${formatRadius(radiusM)}`}`
      : (kort?.headline ?? forste.headline),
    summary: flere ? forbehold : (kort?.context ?? forste.distanceLabel),
    // Gruppen sier allerede at funnene gjelder søkepunktet. Kortene gjentar det ikke; en sone
    // som ligger i nærheten og ikke på punktet, beholder avstanden.
    facts: sortert.map((fact) => (fact.contains ? { ...fact, distanceLabel: "" } : fact)),
    lists: [],
    overview: null,
    caveat: harLden ? (flere ? LDEN_FORKLARING : `${STOY_KARTNIVA} ${LDEN_FORKLARING}`) : null,
    sourceName: kilder.join(" · "),
  };
}

