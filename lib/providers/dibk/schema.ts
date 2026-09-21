import { z } from "zod";

/**
 * Zod-skjema for DiBK «Planlegging igangsatt», basert på faktiske responser (se docs/data-sources.md).
 * Nullable der vi har observert null. Ukjente felt tillates (API-et er 0.23.dev0 og kan utvides),
 * men kun felt definert her brukes videre.
 */

const position = z.tuple([z.number(), z.number()]).rest(z.number());
const linearRing = z.array(position).min(4);

export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(linearRing).min(1),
});

export const multiPolygonSchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(linearRing).min(1)).min(1),
});

/** YYYY-MM-DD */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planomradeFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.number().int(),
  geometry: z.union([polygonSchema, multiPolygonSchema]),
  properties: z.object({
    arealplan: z.number().int(),
    plannavn: z.string(),
    plantype: z.string().nullable(),
    kunngjøringsdatoVarselOmPlanoppstart: isoDate.nullable(),
    oppdateringsdato: z.string().nullable(),
    nasjonalArealplanId: z.object({
      planid: z.string().nullable(),
      kommunenummer: z.string().regex(/^\d{4}$/),
    }),
    forslagsstillertype: z.string().nullable(),
    lovreferanse: z.string().nullable(),
    link: z.string().nullable(),
    identifikasjon: z
      .object({
        lokalId: z.string().nullable(),
        navnerom: z.string().nullable(),
        versjonId: z.string().nullable(),
      })
      .nullable(),
  }),
});

export type PlanomradeFeature = z.infer<typeof planomradeFeatureSchema>;

export const plandokumentFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.number().int(),
  properties: z.object({
    arealplan: z.number().int(),
    referanseDokumentfil: z.url(),
    tittel: z.string(),
    mimeType: z.string().nullable(),
    dokumenttype: z.string().nullable(),
    dokumentetsDato: isoDate.nullable(),
  }),
});

export type PlandokumentFeature = z.infer<typeof plandokumentFeatureSchema>;

export const featureCollectionPageSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.unknown()),
  numberMatched: z.number().int().optional(),
  numberReturned: z.number().int().optional(),
  links: z
    .array(z.object({ rel: z.string(), href: z.string() }).loose())
    .optional(),
});
