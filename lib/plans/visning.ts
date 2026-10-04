import type { AreaEvent } from "@/types/event";
import { erTiltakstype, klassifiserTiltak, TILTAKSTYPE_LABELS, type Tiltakstype } from "./tiltakstype";

/**
 * Hvordan en plansak presenteres og sorteres. Ren logikk, uten oppslag: brukes av både
 * saklista på /omrade og sakssiden.
 */

/**
 * Forbeholdet som følger plansakene overalt: kilden er varsel om planoppstart, og sier ikke hva
 * som skjedde etterpå.
 */
export const STATUS_FORBEHOLD = "Vi vet ikke om planene senere er vedtatt, endret eller lagt bort.";

/** En endring av en plan som allerede gjelder, ikke et nytt prosjekt. */
export function erPlanendring(plantype: string | null | undefined): boolean {
  return /mindre|forenklet|endring/i.test(plantype ?? "");
}

/**
 * Tiltakstypen for en sak. Uttrekket fra synken brukes når det finnes; ellers leses tittelen med
 * samme ordliste, slik at en sak som ikke er lest ennå, ikke står uten type.
 */
export function tiltakstypeFor(event: Pick<AreaEvent, "title" | "attributes">): Tiltakstype {
  const lagret = event.attributes.tiltakstype;
  return erTiltakstype(lagret) ? lagret : klassifiserTiltak({ title: event.title }).type;
}

/**
 * Merkelappen over tittelen. En mindre endring av en gjeldende plan heter «Planendring», også når
 * planen gjelder boliger: å kalle den «Boligprosjekt» ville lovet mer enn saken er.
 */
export function tiltakLabel(event: Pick<AreaEvent, "title" | "attributes">): string {
  if (erPlanendring(event.attributes.plantype)) return "Planendring";
  return TILTAKSTYPE_LABELS[tiltakstypeFor(event)];
}

/** Ordrett formål fra saksdokumentene, eller null. */
export function formaalFor(event: Pick<AreaEvent, "attributes">): string | null {
  const formaal = event.attributes.formaal?.trim();
  return formaal ? formaal : null;
}

/**
 * RELEVANS. Ikke en vurdering av om prosjektet er bra eller dårlig, bare av hvor sannsynlig det er
 * at saken angår stedet brukeren søkte på. Regelen bruker bare dokumenterte forhold, og ingen
 * poengsum vises.
 *
 * Tre grupper, i denne rekkefølgen:
 *
 * 1. Nær: søkepunktet ligger i planområdet, eller planområdets kant er innen 300 m og saken er
 *    ikke en planendring.
 * 2. Øvrige saker.
 * 3. Planendringer mer enn 500 m unna.
 *
 * Innenfor en gruppe:
 *
 * a. avstand til planområdets kant, i trinn på 100 m,
 * b. saker med kjent tiltakstype foran «planarbeid» uten kjent type,
 * c. større planområde foran mindre,
 * d. nyeste varsel først.
 */
const NÆR_M = 300;
const FJERN_ENDRING_M = 500;
const AVSTANDSTRINN_M = 100;

export type Relevansgruppe = 1 | 2 | 3;

export function relevansgruppe(event: Pick<AreaEvent, "distanceM" | "attributes">): Relevansgruppe {
  const endring = erPlanendring(event.attributes.plantype);
  if (event.distanceM < 1) return 1;
  if (!endring && event.distanceM <= NÆR_M) return 1;
  if (endring && event.distanceM > FJERN_ENDRING_M) return 3;
  return 2;
}

export function sorterEtterRelevans<T extends AreaEvent>(events: readonly T[]): T[] {
  const nøkkel = (event: T) => ({
    gruppe: relevansgruppe(event),
    trinn: Math.floor(event.distanceM / AVSTANDSTRINN_M),
    ukjentType: tiltakstypeFor(event) === "annet" ? 1 : 0,
    areal: event.computedAreaM2 ?? 0,
    dato: event.announcedAt ?? "",
  });
  return events
    .map((event) => ({ event, n: nøkkel(event) }))
    .sort(
      (a, b) =>
        a.n.gruppe - b.n.gruppe ||
        a.n.trinn - b.n.trinn ||
        a.n.ukjentType - b.n.ukjentType ||
        b.n.areal - a.n.areal ||
        b.n.dato.localeCompare(a.n.dato) ||
        a.event.id.localeCompare(b.event.id),
    )
    .map(({ event }) => event);
}
