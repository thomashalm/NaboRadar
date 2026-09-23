import { describe, expect, it, vi } from "vitest";
import { MdirForurensetGrunnProvider } from "@/lib/providers/mdir/forurenset-grunn";
import { isWasteFacility, MdirIndustriProvider } from "@/lib/providers/mdir/industri";
import { hasDrawableArea, splitLargeMultiGeometry } from "@/lib/providers/geometry";
import { NveKvikkleireSonerProvider } from "@/lib/providers/nve/kvikkleire-soner";
import { NveNettanleggProvider } from "@/lib/providers/nve/nettanlegg";
import { toVerifiedNveUrl } from "@/lib/providers/nve/urls";
import type { AreaGeometry } from "@/types/area-feature";

const square = (x = 10.75, y = 59.91, d = 0.001) => ({
  type: "Polygon" as const,
  coordinates: [[[x - d, y - d], [x + d, y - d], [x + d, y + d], [x - d, y + d], [x - d, y - d]]],
});

const feature = (properties: Record<string, unknown>, geometry: unknown = square()) => ({ type: "Feature", geometry, properties });

describe("MdirForurensetGrunnProvider", () => {
  const provider = new MdirForurensetGrunnProvider();
  /** Minste sett felter kilden alltid leverer. */
  const BASE = {
    identifikasjon_lokalid: "1",
    lokalitet_navn: null,
    lokalitet_type: null,
    paavirkningsgrad: null,
    tilstandsklasse: null,
    prosess_status: null,
    status: null,
    arealbruk: null,
    areal_totalt: null,
    datafangstdato: null,
    faktaark: null,
    oppdateringsdato: null,
  };

  it("lagrer lokalitetsnavnet, men aldri virksomhetsnavn eller næringsgruppe", () => {
    const { records } = provider.normalize({
      features: [
        feature({
          identifikasjon_lokalid: "27049-A",
          lokalitet_navn: "LALLAKROKEN 10 - HOLTEGATA",
          virksomhet_navn: "Et Firma AS",
          naeringsgruppe: "20.102-Treimpregnering",
          lokalitet_type: "deponi",
          paavirkningsgrad: "ikkeAkseptabelForurensning",
          tilstandsklasse: "dårlig",
          prosess_status: "tiltakGjennomført",
          status: "Godkjent",
          arealbruk: "bebyggelseBolig",
          areal_totalt: 1200,
          datafangstdato: "2019-12-04T00:00:00Z",
          faktaark: "https://grunnforurensning.miljodirektoratet.no/faktaark.html?lok_id=27049",
          oppdateringsdato: 1770000000000,
        }),
      ],
      documents: [],
    });
    expect(records).toHaveLength(1);
    const dump = JSON.stringify(records[0]);
    expect(dump).not.toContain("Et Firma AS");
    expect(dump).not.toContain("Treimpregnering");
    expect(records[0]).toMatchObject({
      externalId: "27049-A",
      category: "miljo",
      subtype: "forurenset_grunn",
      title: "Lallakroken 10 - Holtegata",
      sourceUrlType: "factsheet",
      attributes: {
        lokalitetType: "deponi",
        paavirkningsgrad: "ikkeAkseptabelForurensning",
        prosessStatus: "tiltakGjennomført",
        arealbruk: "bebyggelseBolig",
        arealM2: 1200,
        registrertAar: 2019,
        harStoffopplysninger: false,
      },
    });
  });

  it("faller tilbake til lokalitetstypen når kilden mangler navn", () => {
    const { records } = provider.normalize({
      features: [feature({ ...BASE, identifikasjon_lokalid: "1-A", lokalitet_navn: "  ", lokalitet_type: "skytebane" })],
      documents: [],
    });
    expect(records[0]!.title).toBe("Skytebane");
  });

  it("viser ikke lokaliteter uten brukbar geometri", () => {
    const flat = { type: "Polygon", coordinates: [[[10.75, 59.91], [10.75, 59.91], [10.75, 59.91], [10.75, 59.91]]] };
    const { records, rejected } = provider.normalize({
      features: [feature({ ...BASE, identifikasjon_lokalid: "2-A" }, flat)],
      documents: [],
    });
    expect(records).toEqual([]);
    expect(rejected[0]).toMatchObject({ externalId: "2-A", reason: "degenerert geometri uten areal" });
  });

  it("godtar oppdateringsdato både som epoch-tall og ISO-streng", () => {
    const { records, rejected } = provider.normalize({
      features: [
        feature({ ...BASE, identifikasjon_lokalid: "a", oppdateringsdato: 1770000000000 }),
        feature({ ...BASE, identifikasjon_lokalid: "b", oppdateringsdato: "2026-02-17T00:00:00Z" }),
        feature({ ...BASE, identifikasjon_lokalid: "c", oppdateringsdato: null }),
      ],
      documents: [],
    });
    expect(rejected).toEqual([]);
    expect(records.map((r) => r.sourceUpdatedAt?.slice(0, 4))).toEqual(["2026", "2026", undefined]);
  });

  it("aksepterer bare faktaark hos Miljødirektoratet", () => {
    const { records } = provider.normalize({
      features: [feature({ ...BASE, identifikasjon_lokalid: "x", faktaark: "https://example.com/f", oppdateringsdato: null })],
      documents: [],
    });
    expect(records[0]!.sourceUrl).toBeNull();
  });
});

describe("MdirIndustriProvider", () => {
  const provider = new MdirIndustriProvider();

  it("tar kun med aktive anlegg og klassifiserer avfall etter NACE, ikke navn", () => {
    const base = { navn: "Anlegg", bransje: null, anleggstype: "Landbasert", forurensningsmyndighet: "Miljødirektoratet", siste_rapportering_aar: 2023, har_utslipp_luft: 1, har_utslipp_vann: 0, faktaark: null };
    const { records, rejected } = provider.normalize({
      features: [
        feature({ ...base, anlegg_id: 1, navn: "Haraldrud energigjenvinning", bransje: "38.220 - Energigjenvinning", driftsstatus: "Aktiv" }),
        feature({ ...base, anlegg_id: 2, navn: "Industribakeriet AS", bransje: "10.710 - Bakeri", driftsstatus: "Aktiv" }),
        feature({ ...base, anlegg_id: 3, navn: "Nedlagt verk", bransje: "38.320", driftsstatus: "Nedlagt" }),
      ],
      documents: [],
    });
    expect(records.map((r) => [r.externalId, r.subtype])).toEqual([
      ["1", "avfallsanlegg"],
      ["2", "industrianlegg"],
    ]);
    expect(rejected[0]?.reason).toContain("Nedlagt");
  });

  it("isWasteFacility ser bare på NACE-kode", () => {
    expect(isWasteFacility("38.320 - Deponering")).toBe(true);
    expect(isWasteFacility("10.710 - Bakeri")).toBe(false);
    expect(isWasteFacility("Gjenvinning AS")).toBe(false);
    expect(isWasteFacility(null)).toBe(false);
  });
});

describe("NveKvikkleireSonerProvider", () => {
  const provider = new NveKvikkleireSonerProvider();
  const zone = (extra: Record<string, unknown>, geometry: unknown = square()) =>
    feature(
      {
        globalid: "{A}",
        skredomrnavn: "Alfaset vest",
        objekttype: "UtlosningOmr",
        faregrad: "Høy",
        konsekvens: 3,
        risiko: 4,
        kvikkleirestabilitetvurdering: 4,
        skredkvalkartlegging: 1,
        faregraddato: 1302134400000,
        statusskredomr: 1,
        rapporturl: "www.nve.no/oslo/kvikkleirerapporter",
        ...extra,
      },
      geometry,
    );

  it("normaliserer klassene til kodede verdier", () => {
    const { records } = provider.normalize({ features: [zone({})], documents: [] });
    expect(records[0]).toMatchObject({
      category: "grunnforhold",
      subtype: "kvikkleire_sone",
      title: "Alfaset vest",
      attributes: {
        omradetype: "losneomrade",
        faregrad: "Høy",
        konsekvens: "meget_alvorlig",
        risikoklasse: 4,
        stabilitet: "mulig",
        undersokelse: "enkel",
        vurdertAar: 2011,
      },
    });
    expect(records[0]!.sourceUrl).toBe("https://www.nve.no/oslo/kvikkleirerapporter");
  });

  it("gir soner uten fare egen subtype", () => {
    const { records } = provider.normalize({
      features: [zone({ globalid: "{B}", faregrad: "Ingen", kvikkleirestabilitetvurdering: 5, skredomrnavn: "Område uten fare" })],
      documents: [],
    });
    expect(records[0]!.subtype).toBe("kvikkleire_utredet_uten_fare");
  });

  it("avviser degenererte flater i stedet for å sende dem til databasen", () => {
    const flat = { type: "Polygon", coordinates: [[[10.75, 59.91], [10.75, 59.91], [10.75, 59.91], [10.75, 59.91]]] };
    const { records, rejected } = provider.normalize({ features: [zone({}, flat)], documents: [] });
    expect(records).toEqual([]);
    expect(rejected[0]?.reason).toContain("degenerert");
  });

  it("lagrer aldri bemerkning eller oppdragsgiver", () => {
    const { records } = provider.normalize({
      features: [zone({ bemerkning: "Revidert ifm. boligprosjekt på gnr./bnr. 29/1110", oppdragsgiver: "Privatperson" })],
      documents: [],
    });
    const dump = JSON.stringify(records[0]);
    expect(dump).not.toContain("gnr");
    expect(dump).not.toContain("Privatperson");
  });
});

describe("NveNettanleggProvider", () => {
  it("merker stasjoner og ledninger med nettnivå", () => {
    const provider = new NveNettanleggProvider();
    const props = { globalid: "{L}", navn: "Majorstua", eier: "ELVIA AS", spenning_kv: 132, objekttype: "Transformatorstasjon", driftsattaar: 1950 };
    const { records } = provider.normalize({
      features: [
        { layer: { id: 5, subtype: "transformatorstasjon", nett: null }, feature: feature(props, { type: "Point", coordinates: [10.71, 59.93] }) },
        { layer: { id: 1, subtype: "kraftledning", nett: "regional" }, feature: feature({ ...props, globalid: "{M}", navn: "Ulven – Furuset" }, { type: "LineString", coordinates: [[10.7, 59.9], [10.8, 59.95]] }) },
      ],
      documents: [],
    });
    expect(records.map((r) => [r.subtype, r.attributes.nettnivaa])).toEqual([
      ["transformatorstasjon", null],
      ["kraftledning", "regional"],
    ]);
    expect(records.every((r) => r.category === "infrastruktur")).toBe(true);
  });
});

describe("toVerifiedNveUrl", () => {
  it("legger bare til https:// for kjente NVE-verter", () => {
    expect(toVerifiedNveUrl("www.nve.no/oslo/rapporter")).toBe("https://www.nve.no/oslo/rapporter");
    expect(toVerifiedNveUrl("https://publikasjoner.nve.no/rapport.pdf")).toBe("https://publikasjoner.nve.no/rapport.pdf");
  });

  it("reparerer ikke andre lenker", () => {
    expect(toVerifiedNveUrl("www.example.com/rapport")).toBeNull();
    expect(toVerifiedNveUrl("nve.no.evil.example.com/x")).toBeNull();
    expect(toVerifiedNveUrl("Se vedlegg")).toBeNull();
    expect(toVerifiedNveUrl("")).toBeNull();
    expect(toVerifiedNveUrl(null)).toBeNull();
    // Vi legger bare til manglende protokoll; en eksplisitt http-lenke skrives ikke om.
    expect(toVerifiedNveUrl("http://www.nve.no/x")).toBeNull();
  });
});

describe("geometri-hjelpere", () => {
  it("deler store flerdelte geometrier, men lar små være", () => {
    const small = square() as AreaGeometry;
    expect(splitLargeMultiGeometry(small)).toEqual([small]);

    const parts = Array.from({ length: 400 }, (_, i) => square(10 + i / 1000).coordinates);
    const big = { type: "MultiPolygon", coordinates: parts } as AreaGeometry;
    const split = splitLargeMultiGeometry(big, 20_000);
    expect(split.length).toBeGreaterThan(1);
    expect(split.every((g) => JSON.stringify(g).length <= 25_000)).toBe(true);
    const totalParts = split.reduce((sum, g) => sum + (g as { coordinates: unknown[] }).coordinates.length, 0);
    expect(totalParts).toBe(400);
  });

  it("kjenner igjen flater uten areal", () => {
    expect(hasDrawableArea(square() as AreaGeometry)).toBe(true);
    expect(hasDrawableArea({ type: "Polygon", coordinates: [[[10.75, 59.91], [10.75, 59.91], [10.75, 59.91], [10.75, 59.91]]] } as AreaGeometry)).toBe(false);
    expect(hasDrawableArea({ type: "Point", coordinates: [10, 60] } as AreaGeometry)).toBe(true);
  });
});

describe("healthCheck", () => {
  it("rapporterer feil uten å kaste", async () => {
    const failing = vi.fn(async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;
    const health = await new MdirForurensetGrunnProvider(failing, { timeoutMs: 100, maxRetries: 0, baseDelayMs: 1 }).healthCheck();
    expect(health.ok).toBe(false);
  });
});
