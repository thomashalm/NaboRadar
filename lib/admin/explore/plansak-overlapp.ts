import "server-only";
import type { AreaFeatureRad } from "./area-features";
import { forurensetGrunnFeature } from "./forurenset-grunn";
import { kraftnettFeature } from "./kraftnett";
import { kvikkleireFeature } from "./kvikkleire";
import type { ExploreAnalysis, OverlapTexts } from "./types";

/**
 * «Finn overlapp» for plansaker: hvilke referanselag som støttes, og hvordan et treff beskrives.
 *
 * Tekstene sier hva geometrien viser — at to kartflater har felles areal, at en linje krysser
 * en flate — og ikke mer. «Planlagt på kvikkleire» eller «forurenset planområde» er faglige
 * konklusjoner vi ikke har grunnlag for. Regelen for hva som er et treff, står i migrasjonen
 * `explore_events_overlap`: minst 10 m² felles areal for flater.
 */
export const PLANSAK_OVERLAPP: Record<string, OverlapTexts> = {
  kvikkleire: {
    title: "Plansaker som overlapper kvikkleire",
    predicate: "overlapper kartlagt kvikkleiresone",
    edgeNote: "har under 10 m² felles med en kartlagt kvikkleiresone",
  },
  "forurenset-grunn": {
    title: "Plansaker som overlapper forurenset grunn",
    predicate: "overlapper registrert lokalitet for forurenset grunn",
    edgeNote: "har under 10 m² felles med en registrert lokalitet",
  },
  kraftnett: {
    title: "Plansaker med kraftnett i planområdet",
    predicate: "har kraftledning som krysser eller transformatorstasjon innenfor planområdet",
    edgeNote: null,
  },
};

/** Et referanseobjekt slik `explore_events_overlap` gir det: uten geometri. */
export interface OverlappTreff {
  id: string;
  external_id: string;
  title: string;
  subtype: string;
  attributes: AreaFeatureRad["attributes"];
}

const antall = (n: number, en: string, flere: string) => `${n.toLocaleString("nb-NO")} ${n === 1 ? en : flere}`;

/** Referanseobjektet beskrevet med de samme ordene som i sitt eget panel. Geometrien trengs ikke. */
function rad(treff: OverlappTreff): AreaFeatureRad {
  const punkt = { type: "Point" as const, coordinates: [0, 0] };
  return { ...treff, source_url: null, source_updated_at: null, geometry: punkt, center: punkt, total: 0 };
}

const verdier = (details: { label: string; value: string }[], labels: string[]) =>
  labels.flatMap((label) => {
    const funnet = details.find((d) => d.label === label);
    return funnet ? [`${label}: ${funnet.value}`] : [];
  });

/**
 * Analysen for én plansak: én linje til listen, og blokken til detaljpanelet. `total` er hvor
 * mange referanseobjekter som ble truffet; `treff` kan være færre (taket per plansak).
 */
export function plansakOverlapp(refId: string, treff: OverlappTreff[], total: number): { summary: string; analysis: ExploreAnalysis } | null {
  const more = Math.max(0, total - treff.length);
  switch (refId) {
    case "kvikkleire": {
      // NVE har løsneområdet og utløpsområdet til en sone som hver sin flate, med samme navn.
      // To flater med samme navn i samme planområde er én sone — ellers teller vi dobbelt.
      const soner = new Map<string, { id: string; title: string; lines: string[]; deler: string[] }>();
      for (const t of treff) {
        const f = kvikkleireFeature(rad(t) as Parameters<typeof kvikkleireFeature>[0], null);
        const del = f.details.find((d) => d.label === "Områdetype")?.value ?? null;
        const sone = soner.get(f.title);
        if (sone) {
          if (del && !sone.deler.includes(del)) sone.deler.push(del);
          continue;
        }
        // Mangler sonen risikoklasse eller faregrad i kilden, står det ikke noe om det.
        soner.set(f.title, { id: t.id, title: f.title, lines: verdier(f.details, ["Status", "Risikoklasse", "Faregrad", "Konsekvens"]), deler: del ? [del] : [] });
      }
      // Er ikke alle flatene beskrevet (taket per plansak), vet vi ikke hvor mange soner det er.
      const hva = `${more > 0 ? "minst " : ""}${antall(soner.size, "kartlagt kvikkleiresone", "kartlagte kvikkleiresoner")}`;
      return {
        summary: `Overlapper ${hva}`,
        analysis: {
          heading: "Overlapper kvikkleire",
          lines: [`Planområdet overlapper ${hva}.`],
          items: [...soner.values()].map(({ deler, ...sone }) => ({
            ...sone,
            lines: [...sone.lines, ...(deler.length > 0 ? [`Del av sonen som treffes: ${deler.sort().join(" og ")}`] : [])],
          })),
          more,
        },
      };
    }
    case "forurenset-grunn": {
      const hva = antall(total, "registrert lokalitet", "registrerte lokaliteter");
      return {
        summary: `Overlapper ${hva} for forurenset grunn`,
        analysis: {
          heading: "Overlapper forurenset grunn",
          lines: [
            `Planområdet overlapper ${hva} for forurenset grunn.`,
            // Overlapp er ikke det samme som at planområdet er forurenset.
            "Overlappet gjelder den delen av planområdet som ligger innenfor lokaliteten. Det sier ikke at hele planområdet er forurenset.",
          ],
          items: treff.map((t) => {
            const f = forurensetGrunnFeature(rad(t), null);
            return { id: t.id, title: f.title, lines: verdier(f.details, ["Vurdering", "Oppfølging"]) };
          }),
          more,
        },
      };
    }
    case "kraftnett": {
      // To ulike ting, og de heter ikke det samme: en ledning krysser, en stasjon ligger innenfor.
      // Tellingen gjelder dem som er listet; `more` sier fra hvis taket er nådd.
      const ledninger = treff.filter((t) => t.subtype !== "transformatorstasjon").length;
      const stasjoner = treff.length - ledninger;
      const krysser = ledninger > 0 ? `${antall(ledninger, "kraftledning krysser", "kraftledninger krysser")} planområdet` : null;
      const innenfor = stasjoner > 0 ? `${antall(stasjoner, "transformatorstasjon ligger", "transformatorstasjoner ligger")} innenfor` : null;
      const linjer = [krysser, innenfor].filter((l): l is string => l !== null);
      return {
        summary: linjer.join(" · "),
        analysis: {
          heading: "Kraftnett i planområdet",
          lines: linjer.map((l) => `${l[0]!.toUpperCase()}${l.slice(1)}.`),
          items: treff.map((t) => {
            const f = kraftnettFeature(rad(t), null);
            return { id: t.id, title: f.title, lines: [f.title.startsWith(f.kind) ? null : f.kind, f.summary].filter((l): l is string => !!l) };
          }),
          more,
        },
      };
    }
    default:
      return null;
  }
}
