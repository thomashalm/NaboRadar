import { describe, expect, it } from "vitest";
import fixture from "./fixtures/dibk/planomrade-majorstuen.json";
import { isAllowedDocument } from "@/lib/providers/dibk/documents";
import {
  featureCollectionPageSchema,
  planomradeFeatureSchema,
} from "@/lib/providers/dibk/schema";
import { toSafeHttpUrl } from "@/lib/url";

// Fixture: ekte respons fra DiBK planomrade, bbox rundt Majorstuen, hentet 2026-09-21.

describe("DiBK planomrade-skjema", () => {
  it("godtar en ekte respons", () => {
    const page = featureCollectionPageSchema.parse(fixture);
    expect(page.features.length).toBeGreaterThan(0);
    for (const feature of page.features) {
      expect(planomradeFeatureSchema.safeParse(feature).success).toBe(true);
    }
  });

  it("avviser feature uten geometri", () => {
    const feature = structuredClone(fixture.features[0]) as Record<string, unknown>;
    feature.geometry = null;
    expect(planomradeFeatureSchema.safeParse(feature).success).toBe(false);
  });

  it("avviser feature uten arealplan-ID", () => {
    const feature = structuredClone(fixture.features[0]) as { properties: Record<string, unknown> };
    delete feature.properties.arealplan;
    expect(planomradeFeatureSchema.safeParse(feature).success).toBe(false);
  });

  it("avviser HTML-feilside som FeatureCollection", () => {
    expect(featureCollectionPageSchema.safeParse("<!doctype html>500").success).toBe(false);
  });
});

describe("dokument-allowlist", () => {
  const pdf = { mimeType: "application/pdf", tittel: "Varsel om oppstart av planarbeid.pdf" };

  it("tillater verifiserte typer", () => {
    expect(isAllowedDocument({ ...pdf, dokumenttype: "ref-data-as-pdf" })).toBe(true);
    expect(isAllowedDocument({ ...pdf, dokumenttype: "PlanomraadePdf" })).toBe(true);
    expect(isAllowedDocument({ ...pdf, dokumenttype: "ReferatOppstartsmoete" })).toBe(true);
  });

  it("blokkerer berørte parter slik den faktisk ser ut i kilden", () => {
    expect(
      isAllowedDocument({
        dokumenttype: null,
        mimeType: "application/json",
        tittel: "beroerteParter.json",
      }),
    ).toBe(false);
  });

  it("blokkerer berørte parter selv om typen skulle vært tillatt", () => {
    expect(
      isAllowedDocument({
        dokumenttype: "ref-data-as-pdf",
        mimeType: "application/pdf",
        tittel: "Liste over berørte parter.pdf",
      }),
    ).toBe(false);
  });

  it("blokkerer ukjente typer", () => {
    expect(isAllowedDocument({ ...pdf, dokumenttype: "Annet" })).toBe(false);
    expect(isAllowedDocument({ ...pdf, dokumenttype: "Planomraade" })).toBe(false);
  });
});

describe("toSafeHttpUrl", () => {
  it("godtar fullstendige http(s)-URL-er", () => {
    expect(
      toSafeHttpUrl("https://innsyn.pbe.oslo.kommune.no/saksinnsyn/casedet.asp?caseno=202602282"),
    ).toBe("https://innsyn.pbe.oslo.kommune.no/saksinnsyn/casedet.asp?caseno=202602282");
  });

  it("avviser fritekst observert i kilden", () => {
    expect(toSafeHttpUrl("")).toBeNull();
    expect(toSafeHttpUrl(null)).toBeNull();
    expect(toSafeHttpUrl("Se vedlegg")).toBeNull();
    expect(toSafeHttpUrl("www.oslo.kommune.no/saksinnsyn.")).toBeNull();
  });

  it("avviser andre protokoller", () => {
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeHttpUrl("ftp://example.no/fil")).toBeNull();
  });
});
