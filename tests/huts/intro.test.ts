import { describe, expect, it } from "vitest";
import { hutIntroText } from "@/lib/huts/wording";

type Input = Parameters<typeof hutIntroText>[0];
const base: Input = {
  name: "Testbu",
  type: "unstaffed_hut",
  municipalityName: "Skjåk",
  countyName: "Innlandet",
  elevationM: 1142,
  managerName: null,
  access: "unknown",
  accessStatus: "unknown",
  bookingUrl: null,
  infoUrl: null,
};
// Tusenskilletegnet er et hardt mellomrom, så tallet ikke brytes over to linjer.
const tekst = (endring: Partial<Input>) => hutIntroText({ ...base, ...endring }).map((s) => s.replace(/\u00a0/g, " "));

describe("«Kort om hytta»", () => {
  it("bare navn, type og sted: én setning, ingen fyll", () => {
    expect(tekst({})).toEqual(["Testbu er en ubetjent hytte i Skjåk i Innlandet, omtrent 1 142 meter over havet."]);
  });

  it("tusenskillet er et hardt mellomrom", () => {
    expect(hutIntroText(base)[0]).toContain("1\u00a0142 meter");
  });

  it("høyden står bare fra 100 moh., og bare når den er kjent", () => {
    expect(tekst({ elevationM: 99 })[0]).toBe("Testbu er en ubetjent hytte i Skjåk i Innlandet.");
    expect(tekst({ elevationM: null })[0]).toBe("Testbu er en ubetjent hytte i Skjåk i Innlandet.");
  });

  it("uten kommune: ingen stedsangivelse, og ingenting gjettet", () => {
    expect(tekst({ municipalityName: null, countyName: null })).toEqual(["Testbu er en ubetjent hytte, omtrent 1 142 meter over havet."]);
    // Kommune og fylke med samme navn står én gang.
    expect(tekst({ municipalityName: "Oslo", countyName: "Oslo", elevationM: null })[0]).toBe("Testbu er en ubetjent hytte i Oslo.");
  });

  it("uten forvalter: tilgangen står alene når den er tydelig", () => {
    expect(tekst({ access: "locked_prebooking" })[1]).toBe("Hytta er låst og må bestilles på forhånd.");
    // Kartverkets «ulåst eller DNT-nøkkel» er to ting på en gang og står bare i Fakta.
    expect(tekst({ access: "unlocked_or_dnt_key" })).toHaveLength(1);
  });

  it("forvalter og tilgang i samme setning", () => {
    expect(tekst({ managerName: "Skjåk Almenning", access: "locked_prebooking" })[1]).toBe(
      "Hytta forvaltes av Skjåk Almenning, og den er låst og må bestilles på forhånd.",
    );
  });

  it("ingen lenke: ingen avslutningssetning", () => {
    const t = tekst({ managerName: "Skjåk Almenning", access: "locked_prebooking" });
    expect(t).toHaveLength(2);
    expect(t.join(" ")).not.toMatch(/Under finner du|Bestilling|Mer informasjon/);
  });

  it("bookinglenke: hvor man bestiller, med navnet fra lenken eller forvalteren", () => {
    expect(tekst({ managerName: "Skjåk Almenning", bookingUrl: "https://www.inatur.no/hytte/1" }).at(-1)).toBe("Bestilling skjer via Inatur.");
    expect(tekst({ managerName: "DNT Oslo og Omegn", bookingUrl: "https://hyttebestilling.dnt.no/hytte/1" }).at(-1)).toBe("Bestilling skjer hos DNT.");
    expect(tekst({ managerName: "Halne Fjellstugu", bookingUrl: "https://booking.halne.no/" }).at(-1)).toBe("Bestilling skjer hos Halne Fjellstugu.");
    // En lenke uten navn verken i adressen eller som forvalter gir ingen setning.
    expect(tekst({ bookingUrl: "https://eksempel.no/bestill" })).toHaveLength(1);
  });

  it("kun infoside", () => {
    expect(tekst({ managerName: "Skjåk Almenning", infoUrl: "https://www.skjak-almenning.no/hytte" }).at(-1)).toBe(
      "Mer informasjon finnes hos Skjåk Almenning.",
    );
    expect(tekst({ infoUrl: "https://www.statskog.no/x" }).at(-1)).toBe("Mer informasjon finnes hos Statskog.");
  });

  it("midlertidig stengt", () => {
    expect(tekst({ managerName: "Troms Turlag", accessStatus: "closed" })).toContain("Den er midlertidig stengt.");
    // Bookinglenken står igjen bare som informasjon — ingen invitasjon til å bestille en stengt hytte.
    const t = tekst({ managerName: "Troms Turlag", accessStatus: "closed", bookingUrl: "https://hyttebestilling.dnt.no/hytte/1" });
    expect(t.slice(-2)).toEqual(["Den er midlertidig stengt.", "Mer informasjon finnes hos DNT."]);
  });

  it("ikke for allmennheten: sier det, og ber ikke om bestilling", () => {
    const t = tekst({ managerName: "Kvinesdal kommune", access: "not_public", bookingUrl: "https://www.inatur.no/hytte/1", type: "staffed_hut" });
    expect(t[1]).toBe("Hytta forvaltes av Kvinesdal kommune, og den er ikke et tilbud til allmennheten.");
    expect(t.join(" ")).not.toMatch(/Bestilling/);
    expect(t.at(-1)).toBe("Mer informasjon finnes hos Inatur.");
  });

  it("rastebu og dagsturhytte: «ikke overnatting», med riktig pronomen", () => {
    expect(tekst({ type: "rest_cabin", access: "unlocked" })).toEqual([
      "Testbu er en rastebu i Skjåk i Innlandet, omtrent 1 142 meter over havet.",
      "Bua er ulåst.",
      "Den er beregnet på rast og dagsbesøk, ikke på overnatting.",
    ]);
    expect(tekst({ type: "day_trip_hut" })).toContain("Den er beregnet på rast og dagsbesøk, ikke på overnatting.");
    expect(tekst({ type: "open_cabin", managerName: "Statskog", access: "unlocked" })[1]).toBe("Koia forvaltes av Statskog, og den er ulåst.");
  });

  it("betjent hytte: døra nevnes bare når den stenger noen ute", () => {
    expect(tekst({ type: "staffed_hut", managerName: "DNT Oslo og Omegn", access: "dnt_key" })[1]).toBe("Hytta forvaltes av DNT Oslo og Omegn.");
    expect(tekst({ type: "staffed_hut", access: "locked_prebooking" })[1]).toBe("Hytta er låst og må bestilles på forhånd.");
  });

  it("aldri mer enn fire setninger", () => {
    const t = tekst({ type: "rest_cabin", managerName: "X", access: "unlocked", accessStatus: "closed", infoUrl: "https://www.dnt.no/x" });
    expect(t.length).toBeLessThanOrEqual(4);
  });
});
