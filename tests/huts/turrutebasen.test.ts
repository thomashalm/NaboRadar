import { describe, expect, it } from "vitest";
import { KartverketTurrutebasenHytterProvider, turruteHutName, turruteManager } from "@/lib/providers/kartverket/turrutebasen-hytter";

const punkt = (o: { id?: string; kode: string; opphav?: string; informasjon?: string; ansvarlig?: string; pos?: string }) => ({
  identifikasjon: { Identifikasjon: { lokalId: o.id ?? "085c577f-feb2-41e8-b2ba-23e8c2e2c337" } },
  oppdateringsdato: "2023-10-25T09:28:50",
  opphav: o.opphav,
  informasjon: o.informasjon,
  tilrettelegging: o.kode,
  vedlikeholdsansvarlig: o.ansvarlig,
  // WFS-en svarer med breddegrad først.
  posisjon: { Point: { pos: o.pos ?? "60.051671 10.550021" } },
});

describe("Turrutebasen: navn og forvalter", () => {
  it("bruker opphav som navn, og informasjon når opphav er en digitaliseringsmetode", () => {
    expect(turruteHutName("Smedmyrkoia", null)).toBe("Smedmyrkoia");
    expect(turruteHutName("Rett i kartet", "Svartvannshytta - ubetjent DNT hytte")).toBe("Svartvannshytta");
    expect(turruteHutName("Rett i kartet", "Fiskelaushytta")).toBe("Fiskelaushytta");
    // «Rastebu» og «Dagstur» er beskrivelser, ikke navn.
    expect(turruteHutName("Rett i kartet", "Rastebu")).toBeNull();
    expect(turruteHutName(null, null)).toBeNull();
  });

  it("skiller kategoriord fra navngitte forvaltere", () => {
    expect(turruteManager("DNT")).toEqual({ owner_kind: "dnt", manager_name: null });
    expect(turruteManager("Andre")).toEqual({ owner_kind: "other", manager_name: null });
    expect(turruteManager("DNT | DNT Oslo og Omegn")).toEqual({ owner_kind: "dnt", manager_name: "DNT Oslo og Omegn" });
    expect(turruteManager("DNT | |DNT Oslo og omegn")).toEqual({ owner_kind: "dnt", manager_name: "DNT Oslo og omegn" });
    // Et navn uten kategori sier hvem som forvalter, ikke hva slags eier det er.
    expect(turruteManager("Lunner Almenning")).toEqual({ owner_kind: null, manager_name: "Lunner Almenning" });
    expect(turruteManager("Alta og omegn turlag, DNT")).toMatchObject({ owner_kind: "dnt" });
    expect(turruteManager("Ukjent")).toEqual({ owner_kind: null, manager_name: null });
    expect(turruteManager(null)).toEqual({ owner_kind: null, manager_name: null });
  });
});

describe("Turrutebasen: normalisering", () => {
  const provider = new KartverketTurrutebasenHytterProvider();

  it("gir type bare for kodene som er kontrollert mot hovedkilden", () => {
    const { records } = provider.normalize({
      features: [
        punkt({ id: "a", kode: "42", opphav: "Kobberhaughytta", ansvarlig: "DNT" }),
        punkt({ id: "b", kode: "43", opphav: "Sellanrå", ansvarlig: "Andre" }),
        punkt({ id: "c", kode: "44", opphav: "Smedmyrkoia", ansvarlig: "DNT" }),
        // «Hytte» uten nærmere type: kan støtte en hytte, men sier ikke hva den er.
        punkt({ id: "d", kode: "12", opphav: "Ullevålseter", ansvarlig: "Andre" }),
      ],
      documents: [],
    });
    expect(records.map((r) => [r.externalId, r.title, r.attributes.hut_type, r.attributes.overnight])).toEqual([
      ["a", "Kobberhaughytta", "staffed_hut", "yes"],
      ["b", "Sellanrå", "self_service_hut", "yes"],
      ["c", "Smedmyrkoia", "unstaffed_hut", "yes"],
      ["d", "Ullevålseter", null, null],
    ]);
    expect(records[0]).toMatchObject({ category: "hytte_kilde", sourceUpdatedAt: "2023-10-25T09:28:50.000Z" });
    expect((records[0]!.geometry as unknown as { coordinates: number[] }).coordinates).toEqual([10.550021, 60.051671]);
    // Kilden sier ingenting om lås, senger eller kommune.
    expect(records[0]!.attributes).toMatchObject({ locked: null, beds: null, municipality_number: null });
  });

  it("utelater punkter utenfor piloten og uten navn, og avviser punkter uten ID", () => {
    const { records, rejected, skipped } = provider.normalize({
      features: [
        punkt({ id: "nord", kode: "44", opphav: "Rundvannshytta", pos: "70.634750 23.789304" }),
        punkt({ id: "navnløs", kode: "44", opphav: "Rett i kartet" }),
        { ...punkt({ kode: "44", opphav: "Uten id" }), identifikasjon: undefined },
      ],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(skipped!.map((s) => s.reason)).toEqual(["utenfor pilotområdet", "hytte uten navn"]);
    expect(rejected.map((r) => r.reason)).toEqual(["mangler lokalId"]);
  });
});
