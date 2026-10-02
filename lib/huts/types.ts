/**
 * Hytter og koier: det som er felles for kildene, databasen og visningen.
 *
 * Reglene som gjelder hele veien: vi viser det en kilde faktisk sier, og ingenting annet. En
 * hytte som står i et register er ikke dermed åpen, og «hytte» betyr ikke at man kan overnatte.
 */

/** Kontrollert typologi. Speiler CHECK-listen på `huts.hut_type`. */
export const HUT_TYPES = [
  "staffed_hut",
  "self_service_hut",
  "unstaffed_hut",
  "rest_cabin",
  "open_cabin",
  "day_trip_hut",
  "emergency_shelter",
  "other",
  "unknown",
] as const;
export type HutType = (typeof HUT_TYPES)[number];

/** Eierkategorien slik kilden oppgir den. `other` er kildens «Andre», ikke ukjent. */
export const HUT_OWNER_KINDS = ["dnt", "statskog", "fjellstyre", "kommune", "other", "unknown"] as const;
export type HutOwnerKind = (typeof HUT_OWNER_KINDS)[number];

export const HUT_OVERNIGHT = ["yes", "no", "unknown"] as const;
export type HutOvernight = (typeof HUT_OVERNIGHT)[number];

/**
 * Driftsstatus. Ingen kilde leverer den; den settes for hånd når forvalterens side oppgir at
 * hytta er midlertidig stengt. En hytte som er borte for godt, avvises i stedet.
 */
export const HUT_ACCESS_STATUSES = ["open", "seasonal", "closed", "unknown"] as const;
export type HutAccessStatus = (typeof HUT_ACCESS_STATUSES)[number];

/**
 * Tilgang: dør og nøkkel. De to første er Kartverkets kodeliste («Låst», «Ulåst»); resten
 * finnes bare som overstyring, når forvalterens side sier noe mer presist eller noe annet.
 * Speiler CHECK-listen på `huts.access_override` pluss kildens to verdier.
 */
export const HUT_ACCESS_KINDS = [
  "locked_prebooking",
  "unlocked_or_dnt_key",
  "unlocked",
  "dnt_key",
  "code_lock",
  "special_key",
  "code_or_special_key",
  "unknown",
] as const;
export type HutAccessKind = (typeof HUT_ACCESS_KINDS)[number];

/** Verdiene en overstyring kan ha. Kildens «ulåst eller DNT-nøkkel» er ikke en av dem. */
export const HUT_ACCESS_OVERRIDES = ["unlocked", "dnt_key", "code_lock", "special_key", "code_or_special_key", "locked_prebooking"] as const;
export const HUT_TYPE_OVERRIDES = ["staffed_hut", "self_service_hut", "unstaffed_hut", "rest_cabin", "open_cabin", "day_trip_hut", "emergency_shelter"] as const;

/** Tilgangen slik den vises: overstyringen når den finnes, ellers kildens Låst/Ulåst. */
export function hutAccessKind(locked: boolean | null, override: string | null | undefined): HutAccessKind {
  if (override && (HUT_ACCESS_KINDS as readonly string[]).includes(override)) return override as HutAccessKind;
  return locked === true ? "locked_prebooking" : locked === false ? "unlocked_or_dnt_key" : "unknown";
}

/** Kategorien kildepostene lagres med i `area_features`. Publiseres aldri. */
export const HUT_SOURCE_CATEGORY = "hytte_kilde" as const;

/** Databasefunksjonen som gjør kildeposter til hytter. Se migrasjon 20261019000000. */
export const HUT_REFRESH_FN = "refresh_huts";

/**
 * Attributtene en hyttekilde skriver på kildeposten. `refresh_huts()` leser nøyaktig disse
 * nøklene; en kilde som ikke vet noe om et felt, setter null — den gjetter ikke.
 *
 * Nøkler som begynner med `kilde_` er kildens egne koder, til etterprøving.
 */
export type HutSourceAttributes = {
  hut_type: HutType | null;
  owner_kind: HutOwnerKind | null;
  manager_name: string | null;
  locked: boolean | null;
  overnight: Exclude<HutOvernight, "unknown"> | null;
  beds: number | null;
  municipality_number: string | null;
} & Record<`kilde_${string}`, string | number | boolean | null>;

/**
 * Pilotområdet: Oslomarka med omland. Begge kildene avgrenses til samme rute, slik at en hytte
 * ikke finnes i den ene kilden og mangler i den andre bare fordi avgrensningene var ulike.
 *
 * Landsdekkende import er en egen beslutning — se docs/data-roadmap.md.
 */
export const HUT_PILOT = {
  bbox: { minLng: 10.3, minLat: 59.75, maxLng: 11.1, maxLat: 60.3 },
  /** Kommunene som dekker ruta. N50 leveres per kommune. */
  municipalities: [
    "0301", // Oslo
    "3201", // Bærum
    "3203", // Asker
    "3205", // Lillestrøm
    "3207", // Nordre Follo
    "3209", // Ullensaker
    "3212", // Nesodden
    "3214", // Frogn
    "3218", // Ås
    "3220", // Enebakk
    "3222", // Lørenskog
    "3224", // Rælingen
    "3230", // Gjerdrum
    "3232", // Nittedal
    "3234", // Lunner
    "3236", // Jevnaker
    "3238", // Nannestad
    "3305", // Ringerike
    "3310", // Hole
    "3312", // Lier
    "3446", // Gran
  ],
} as const;

export function inHutPilot([lng, lat]: readonly [number, number]): boolean {
  const { minLng, minLat, maxLng, maxLat } = HUT_PILOT.bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}
