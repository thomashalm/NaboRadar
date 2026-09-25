"use client";

import { createContext, useContext, useMemo } from "react";

/**
 * Valg av kartobjekt fra en liste.
 *
 * Kartet har allerede en valgt-tilstand: klikker du en markør, utheves den, popupen åpner seg,
 * og kartet panorerer hvis objektet ligger utenfor utsnittet. Denne konteksten gir listene på
 * siden tilgang til den samme tilstanden, slik at et trykk i en rad gjør nøyaktig det samme.
 *
 * Bevisst en kontekst og ikke props: valget er omgivelsestilstand for hele resultatsiden, og
 * å tre det gjennom seksjoner, grupper og lister ville lagt støy i fire komponenter som ikke
 * har noe med saken å gjøre. Mekanismen er generell — den gjelder alle kartobjekter, ikke én
 * bestemt type.
 */
export interface MapSelection {
  selectedId: string | null;
  select: (id: string) => void;
  /** Ids som faktisk finnes i kartet. En rad uten kartobjekt skal ikke se klikkbar ut. */
  selectable: ReadonlySet<string>;
}

const TOM: MapSelection = { selectedId: null, select: () => {}, selectable: new Set() };

const Context = createContext<MapSelection>(TOM);

export function MapSelectionProvider({
  selectedId,
  onSelect,
  ids,
  children,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  ids: readonly string[];
  children: React.ReactNode;
}) {
  const verdi = useMemo<MapSelection>(
    () => ({ selectedId, select: onSelect, selectable: new Set(ids) }),
    [selectedId, onSelect, ids],
  );
  return <Context.Provider value={verdi}>{children}</Context.Provider>;
}

export const useMapSelection = () => useContext(Context);
