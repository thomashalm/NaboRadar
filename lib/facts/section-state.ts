import type { AreaFactGroup } from "./queries";

/**
 * Tilstanden til én kilde, sett fra siden. Kildene har svært ulik fart — databasen svarer på
 * 0,1–1,8 s, mens strategisk støykartlegging tok 4,3 s på Alnabru — så hver seksjon står på
 * egne bein: den laster, den er klar, eller den kunne ikke hentes.
 */
export type SourceState = "laster" | "klar" | "feilet";

/**
 * Laster noe ennå, er alt nede, eller har vi noe å vise?
 *
 * En seksjon som mates av flere kilder feiler bare hvis alle er nede. Svarer én av dem, viser
 * vi det vi har; at en enkeltkilde manglet står allerede i kildelisten nederst på siden.
 */
export function combineStates(states: readonly SourceState[]): SourceState {
  if (states.length === 0) return "klar";
  if (states.includes("laster")) return "laster";
  return states.every((state) => state === "feilet") ? "feilet" : "klar";
}

export interface VisibleSection {
  sectionId: string;
  state: SourceState;
  group: AreaFactGroup | undefined;
}

/**
 * Hvilke seksjoner som skal stå på siden, i rekkefølge.
 *
 * En seksjon vises når den har innhold, når den fortsatt laster, eller når den ikke kunne
 * hentes. En seksjon som er ferdig og tom vises ikke — og de andre flytter opp. Å mangle data
 * og å ikke ha noe å vise er to forskjellige ting, og de skal ikke se like ut.
 */
export function visibleSections(input: {
  order: readonly string[];
  groups: readonly AreaFactGroup[];
  stateFor: (sectionId: string) => SourceState;
}): VisibleSection[] {
  const perSeksjon = new Map(input.groups.map((group) => [group.sectionId, group]));
  return input.order.flatMap((sectionId) => {
    const state = input.stateFor(sectionId);
    const group = perSeksjon.get(sectionId);
    if (state === "klar" && !group) return [];
    return [{ sectionId, state, group }];
  });
}
