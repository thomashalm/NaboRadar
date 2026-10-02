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
 * `not_public` sier hvem hytta er for, ikke hvordan døra er: bare medlemmer, skoler eller
 * jegere, eller ikke i utleie. Det er noe annet enn midlertidig stengt.
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
  "not_public",
  "unknown",
] as const;
export type HutAccessKind = (typeof HUT_ACCESS_KINDS)[number];

/** Verdiene en overstyring kan ha. Kildens «ulåst eller DNT-nøkkel» er ikke en av dem. */
export const HUT_ACCESS_OVERRIDES = ["unlocked", "dnt_key", "code_lock", "special_key", "code_or_special_key", "locked_prebooking", "not_public"] as const;
/** Eierkategoriene en overstyring kan ha. Brukes bare når forvalterens side viser at N50s kategori er feil. */
export const HUT_OWNER_OVERRIDES = ["dnt", "statskog", "fjellstyre", "kommune", "other"] as const;
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
 * Rammen en hytte må ligge innenfor: Fastlands-Norge med margin. Hyttene hentes for hele
 * landet; et punkt utenfor rammen er en feil i kilden (byttede akser, null-koordinater), og
 * tas ikke inn. Svalbard og Jan Mayen er ikke med i N50.
 */
export const HUT_BOUNDS = { minLng: 4, minLat: 57.5, maxLng: 32, maxLat: 71.5 } as const;

export function inHutBounds([lng, lat]: readonly [number, number]): boolean {
  const { minLng, minLat, maxLng, maxLat } = HUT_BOUNDS;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}
