import { describe, expect, it } from "vitest";
import { ANLEGG_TYPE_LABEL, describeAnleggSummary, describeFact, describeMapLines } from "@/lib/facts/wording";
import type { AreaAttributes } from "@/types/area-feature";

/**
 * «Nærområdet» skal være nøytralt: dette finnes her, vurder selv.
 * Kilden er et tillatelsesregister, ikke en vurdering av om anlegget er et problem.
 */

/** Haraldrud Varmesentral, slik raden faktisk ser ut i area_features. */
const HARALDRUD: AreaAttributes = {
  bransje: "35.300 - Vannbåren og luftbåren varme- og kjøleforsyning",
  myndighet: "Miljødirektoratet",
  anleggstype: "Landbasert",
  utslippLuft: true,
  utslippVann: false,
  sisteRapporteringAar: 2023,
};

const anlegg = (attributes: AreaAttributes = HARALDRUD, subtype = "industrianlegg", title = "Haraldrud Varmesentral (Hafslund Celsio AS)") =>
  describeFact({ subtype, title, attributes, contains: false, externalId: "5422" })!;

const ALARMISTISK = /forurensende|farlig|miljøfare|risiko|uønsket|advarsel|vær oppmerksom|bekymr/i;

describe("kort for anlegg med utslippstillatelse", () => {
  it("bruker anleggets navn som overskrift", () => {
    expect(anlegg().headline).toBe("Haraldrud Varmesentral (Hafslund Celsio AS)");
  });

  it("sier hva slags anlegg det er, nøytralt", () => {
    expect(anlegg().details[0]).toBe("Anlegg med utslippstillatelse.");
    expect(anlegg(HARALDRUD, "avfallsanlegg").details[0]).toBe("Avfalls- eller gjenvinningsanlegg med utslippstillatelse.");
  });

  it("viser bransje, utslipp og siste rapporteringsår slik kilden oppgir dem", () => {
    expect(anlegg().details).toEqual([
      "Anlegg med utslippstillatelse.",
      "Bransje: 35.300 - Vannbåren og luftbåren varme- og kjøleforsyning",
      "Rapporterer utslipp til luft.",
      "Siste rapportering: 2023.",
    ]);
  });

  it("oppgir ansvarlig myndighet og at posisjonen er et punkt", () => {
    expect(anlegg().caveat).toContain("Tillatelse gitt av Miljødirektoratet");
    expect(anlegg().caveat).toContain("ikke tomtegrensen");
  });

  it("håndterer manglende valgfrie felt uten tomme linjer", () => {
    const magert = anlegg({ myndighet: null });
    expect(magert.details).toEqual(["Anlegg med utslippstillatelse."]);
    expect(magert.caveat).toContain("forurensningsmyndigheten");
    expect(magert.details.every((d) => d.trim().length > 0)).toBe(true);
  });

  it("påstår ikke utslipp kilden ikke oppgir", () => {
    const utenUtslipp = anlegg({ ...HARALDRUD, utslippLuft: false, utslippVann: false });
    expect(utenUtslipp.details.join(" ")).not.toContain("Rapporterer utslipp");
    const begge = anlegg({ ...HARALDRUD, utslippVann: true });
    expect(begge.details.join(" ")).toContain("Rapporterer utslipp til luft og vann.");
  });

  it("bruker aldri alarmistisk språk", () => {
    for (const subtype of ["industrianlegg", "avfallsanlegg"]) {
      const text = anlegg(HARALDRUD, subtype);
      expect([text.headline, ...text.details, text.caveat ?? ""].join(" ")).not.toMatch(ALARMISTISK);
    }
    expect(Object.values(ANLEGG_TYPE_LABEL).join(" ")).not.toMatch(ALARMISTISK);
    const summary = describeAnleggSummary({ total: 6, radiusLabel: "3 km" });
    expect([summary.headline, summary.caveat ?? ""].join(" ")).not.toMatch(ALARMISTISK);
    expect(summary.headline).toBe("6 anlegg med utslippstillatelse innen 3 km");
  });
});

describe("kartpopup", () => {
  it("gjenbruker formuleringsregisteret for anlegg", () => {
    expect(describeMapLines({ subtype: "industrianlegg", attributes: HARALDRUD })).toEqual([
      "Anlegg med utslippstillatelse (Miljødirektoratet)",
      "35.300 - Vannbåren og luftbåren varme- og kjøleforsyning",
    ]);
    expect(describeMapLines({ subtype: "avfallsanlegg", attributes: { bransje: null } })).toEqual([
      "Avfalls- eller gjenvinningsanlegg med utslippstillatelse (Miljødirektoratet)",
    ]);
  });

  it("gjenbruker det samme for forurenset grunn", () => {
    const lines = describeMapLines({
      subtype: "forurenset_grunn",
      attributes: { paavirkningsgrad: "ikkeAkseptabelForurensning" },
    });
    expect(lines).toEqual([
      "Registrert lokalitet med forurenset grunn (Miljødirektoratet)",
      "Myndighetens vurdering: ikke akseptabel – behov for tiltak",
    ]);
  });

  it("gir tom liste for typer kartet ikke har tekst for", () => {
    expect(describeMapLines({ subtype: "kvikkleire_sone", attributes: {} })).toEqual([]);
  });
});
