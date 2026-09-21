import { z } from "zod";

/** Kartverket Adresse-API (ws.geonorge.no/adresser/v1/sok). Felt verifisert 2026-09-21. */
export const kartverketAddressSchema = z.object({
  adressetekst: z.string().min(1),
  adressekode: z.number().int().nullable().optional(),
  nummer: z.number().int().nullable().optional(),
  bokstav: z.string().nullable().optional(),
  kommunenummer: z.string().nullable(),
  kommunenavn: z.string().nullable(),
  postnummer: z.string().nullable(),
  poststed: z.string().nullable(),
  objtype: z.string().nullable().optional(),
  representasjonspunkt: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
});

export const kartverketAddressResponseSchema = z.object({
  metadata: z.object({ totaltAntallTreff: z.number().int() }).loose(),
  adresser: z.array(z.unknown()),
});

export type KartverketAddress = z.infer<typeof kartverketAddressSchema>;

/** Kartverket Stedsnavn-API (ws.geonorge.no/stedsnavn/v1/navn). Merk norske koordinatnøkler. */
export const kartverketPlaceSchema = z.object({
  stedsnummer: z.number().int(),
  skrivemåte: z.string().min(1),
  navneobjekttype: z.string().nullable(),
  språk: z.string().nullable().optional(),
  kommuner: z
    .array(z.object({ kommunenavn: z.string(), kommunenummer: z.string() }))
    .nullable()
    .optional(),
  representasjonspunkt: z.object({
    nord: z.number(),
    øst: z.number(),
  }),
});

export const kartverketPlaceResponseSchema = z.object({
  metadata: z.object({ totaltAntallTreff: z.number().int().optional() }).loose(),
  navn: z.array(z.unknown()),
});

export type KartverketPlace = z.infer<typeof kartverketPlaceSchema>;
