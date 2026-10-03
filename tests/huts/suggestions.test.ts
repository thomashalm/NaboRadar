import { describe, expect, it } from "vitest";
import { foldName, rankSuggestions, suggestionSubtitle, type HutPlace } from "@/lib/huts/suggestions";
import type { Hut } from "@/lib/huts/queries";

const hytte = (name: string, lat: number, lng: number, municipalityName: string | null = null) =>
  ({ id: name, name, lat, lng, municipalityName }) as unknown as Hut;
const sted = (name: string, lat: number, lng: number, area: string | null = null): HutPlace => ({ id: `place:${name}`, name, lat, lng, area });
const navn = (forslag: ReturnType<typeof rankSuggestions>) =>
  forslag.map((f) => (f.kind === "hut" ? `hytte:${f.hut.name}` : `sted:${f.place.name}`));

describe("forslag i søkefeltet på /hytter", () => {
  it("setter et sted som heter akkurat det man skrev, foran hytter som bare begynner likt", () => {
    const forslag = rankSuggestions("Lom", [hytte("Lomsdalshytta", 66.5, 15), hytte("Blomlia", 60, 10)], [sted("Lom", 61.84, 8.57, "Innlandet")]);
    expect(navn(forslag)).toEqual(["sted:Lom", "hytte:Lomsdalshytta", "hytte:Blomlia"]);
  });

  it("setter hytta foran stedet når begge treffer like godt", () => {
    const forslag = rankSuggestions("Gjendebu", [hytte("Gjendebu", 61.48, 8.47)], [sted("Gjendebu", 61.6, 8.9)]);
    expect(navn(forslag)).toEqual(["hytte:Gjendebu", "sted:Gjendebu"]);
  });

  it("viser en hytte bare én gang når stedsnavnregisteret har den som sted", () => {
    const forslag = rankSuggestions("Spiterstulen", [hytte("Spiterstulen", 61.62, 8.4, "Lom")], [sted("Spiterstulen", 61.621, 8.401, "Innlandet")]);
    expect(navn(forslag)).toEqual(["hytte:Spiterstulen"]);
  });

  it("tåler o for ø og a for å, som navnesøket", () => {
    expect(foldName("Tromsø")).toBe(foldName("Tromso"));
    expect(navn(rankSuggestions("Tromso", [], [sted("Tromsø", 69.65, 18.96, "Troms")]))).toEqual(["sted:Tromsø"]);
  });

  it("merker typen tydelig", () => {
    expect(suggestionSubtitle({ kind: "hut", hut: hytte("Aursjobu", 61.9, 8.2, "Skjåk") })).toBe("Hytte · Skjåk");
    expect(suggestionSubtitle({ kind: "place", place: sted("Harstad", 68.8, 16.5, "Troms") })).toBe("Sted · Troms");
    expect(suggestionSubtitle({ kind: "place", place: sted("Ukjent", 60, 10) })).toBe("Sted");
  });

  it("begrenser antallet", () => {
    const mange = Array.from({ length: 12 }, (_, i) => hytte(`Bu ${i}`, 60, 10 + i));
    const steder = Array.from({ length: 6 }, (_, i) => sted(`Bu sted ${i}`, 61, 10 + i));
    const forslag = rankSuggestions("Bu", mange, steder);
    expect(forslag.length).toBeLessThanOrEqual(8);
    expect(forslag.filter((f) => f.kind === "place").length).toBeLessThanOrEqual(3);
  });
});
