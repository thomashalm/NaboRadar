import { describe, expect, it, vi } from "vitest";
import { snapshotNames } from "@/lib/geo/municipalities";
import { breadcrumbList, countyCounts, countyHref, countySlug, findCounty, groupCountyHuts, type IndexHut } from "@/lib/huts/counties";
import { countyIntro, hutTypeCount, hutsAndCabins } from "@/lib/huts/wording";

vi.mock("server-only", () => ({}));

const register = snapshotNames();
const hytte = (id: string, name: string, municipalityNumber: string | null, type: IndexHut["type"] = "unstaffed_hut"): IndexHut => ({ id, name, municipalityNumber, type });

describe("fylkessider for hytter", () => {
  it("gir alle 15 fylker en unik, lesbar adresse", () => {
    const fylker = [...new Set([...register.values()].map((m) => m.county))];
    expect(fylker).toHaveLength(15);
    const slugs = fylker.map(countySlug);
    expect(new Set(slugs).size).toBe(15);
    expect(slugs.every((s) => /^[a-z]+(-[a-z]+)*$/.test(s))).toBe(true);
    expect(countySlug("Trøndelag")).toBe("trondelag");
    expect(countySlug("Møre og Romsdal")).toBe("more-og-romsdal");
    expect(countyHref("Østfold")).toBe("/hytter/fylke/ostfold");
  });

  it("finner fylket og kommunene fra adressen, og ingenting for ukjente adresser", () => {
    const innlandet = findCounty("innlandet", register)!;
    expect(innlandet.county).toBe("Innlandet");
    expect(innlandet.municipalities).toContain("3433"); // Skjåk
    expect(innlandet.municipalities).not.toContain("0301");
    expect(findCounty("oslo", register)!.municipalities).toEqual(["0301"]);
    expect(findCounty("finnes-ikke", register)).toBeNull();
    expect(findCounty("", register)).toBeNull();
  });

  it("teller per fylke, og gjetter aldri fylke for hytter uten kjent kommune", () => {
    const { counties, withoutCounty } = countyCounts(
      [
        { municipalityNumber: "3433", huts: 22 },
        { municipalityNumber: "3434", huts: 23 },
        { municipalityNumber: "0301", huts: 9 },
        { municipalityNumber: null, huts: 29 },
        { municipalityNumber: "9999", huts: 1 },
      ],
      register,
    );
    expect(counties).toEqual([
      { county: "Innlandet", slug: "innlandet", huts: 45 },
      { county: "Oslo", slug: "oslo", huts: 9 },
    ]);
    expect(withoutCounty).toBe(30);
  });

  it("grupperer per kommune, alfabetisk med æ, ø og å, uten dubletter og uten andre fylker", () => {
    const fylke = groupCountyHuts(
      "Innlandet",
      [
        hytte("c", "Åsbu", "3433"),
        hytte("a", "Aursjobu", "3433"),
        hytte("b", "Øvre bu", "3433", "rest_cabin"),
        hytte("a", "Aursjobu", "3433"),
        hytte("d", "Spiterstulen", "3434", "staffed_hut"),
        hytte("e", "Kobberhaughytta", "0301", "staffed_hut"),
        hytte("f", "Uten kommune", null),
      ],
      register,
    );
    expect(fylke.total).toBe(4);
    expect(fylke.municipalities.map((m) => m.name)).toEqual(["Lom", "Skjåk"]);
    expect(fylke.municipalities[1]!.huts.map((h) => h.name)).toEqual(["Aursjobu", "Øvre bu", "Åsbu"]);
    expect(fylke.types).toEqual([
      { type: "unstaffed_hut", count: 2 },
      { type: "staffed_hut", count: 1 },
      { type: "rest_cabin", count: 1 },
    ]);
  });

  it("skriver tall og typer riktig, og ingress uten fylltekst", () => {
    expect(hutTypeCount("rest_cabin", 1)).toBe("1 rastebu");
    expect(hutTypeCount("rest_cabin", 80)).toBe("80 rastebuer");
    expect(hutTypeCount("open_cabin", 2)).toBe("2 åpne koier");
    expect(hutsAndCabins(1)).toBe("1 hytte eller koie");
    expect(hutsAndCabins(348)).toBe("348 hytter og koier");
    expect(countyIntro({ county: "Oslo", total: 9, municipalities: [{}] })).toBe(
      "NaboRadar viser 9 hytter og koier i Oslo, i 1 kommune. Hyttene er hentet fra Kartverkets kartdata, med forvalter og lenke der vi har kontrollert dem.",
    );
  });

  it("brødsmulestien nummererer fra 1 og bruker kanoniske adresser", () => {
    const sti = breadcrumbList([
      { name: "Hytter og koier", url: "https://naboradar.no/hytter" },
      { name: "Innlandet", url: "https://naboradar.no/hytter/fylke/innlandet" },
    ]);
    expect(sti["@type"]).toBe("BreadcrumbList");
    expect(sti.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Hytter og koier", item: "https://naboradar.no/hytter" },
      { "@type": "ListItem", position: 2, name: "Innlandet", item: "https://naboradar.no/hytter/fylke/innlandet" },
    ]);
  });
});
