import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { areaParamsSchema, buildAreaHref, buildEventHref } from "@/lib/area-params";

/**
 * Resultatvisningen finnes på to steder, og navigasjonen inne i den må bli liggende der
 * brukeren er.
 *
 * Dette var rotårsaken til at et research-funn 33 m fra søkepunktet ikke dukket opp i
 * /admin/adresse: søkefeltet, radiusvelgeren og «endre sted» bygde alle `/omrade`-lenker, så
 * operatøren ble sendt ut på den offentlige siden ved første klikk — og den har ingen intern del.
 */
describe("basesti i søkekonteksten", () => {
  const punkt = { lat: 59.919287, lng: 10.59829, radius: 1000 };

  it("holder admin i admin", () => {
    expect(buildAreaHref({ ...punkt, basePath: "/admin/adresse" })).toMatch(/^\/admin\/adresse\?/);
  });

  it("lar offentlige lenker være uendret", () => {
    const href = buildAreaHref(punkt);
    expect(href).toMatch(/^\/omrade\?/);
    // Ingen ny parameter på den offentlige siden — den ligger i canonical og i sitemappen.
    expect(href).not.toContain("fra=");
    expect(buildEventHref("abc", punkt)).not.toContain("fra=");
  });

  it("tar basestien med til saksiden, slik at «tilbake» går riktig vei", () => {
    expect(buildEventHref("abc", { ...punkt, basePath: "/admin/adresse" })).toContain("fra=%2Fadmin%2Fadresse");
  });

  it("godtar bare kjente basestier fra URL-en", () => {
    const les = (fra: string) =>
      areaParamsSchema.parse({ lat: "59.91929", lng: "10.59829", radius: "1000", fra }).fra;
    expect(les("/admin/adresse")).toBe("/admin/adresse");
    expect(les("/omrade")).toBe("/omrade");
    // En sti vi ikke kontrollerer skal ikke kunne bli en lenke vi rendrer.
    expect(les("https://example.invalid/phish")).toBe("/omrade");
    expect(les("//example.invalid")).toBe("/omrade");
    expect(les("/admin/adresse/../../etc")).toBe("/omrade");
  });

  it("faller tilbake til den offentlige siden når fra mangler", () => {
    expect(areaParamsSchema.parse({ lat: "59.91929", lng: "10.59829", radius: "1000" }).fra).toBe("/omrade");
  });

  it("gir admin-visningen basestien sin", () => {
    // Uten disse to er ikke feilen tilbake i databasen — den er tilbake i navigasjonen.
    const side = readFileSync("app/admin/adresse/page.tsx", "utf8");
    expect(side).toMatch(/<AreaExplorer[\s\S]*basePath="\/admin\/adresse"/);
    expect(side).toMatch(/<SearchBox[^>]*basePath="\/admin\/adresse"/);
  });
});
