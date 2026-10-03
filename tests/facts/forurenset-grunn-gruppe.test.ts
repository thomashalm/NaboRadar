import { describe, expect, it } from "vitest";
import { contaminatedFacts, getAreaFacts } from "@/lib/facts/queries";
import type { Db } from "@/lib/db";
import { AREA_SECTIONS, sectionOrder } from "@/types/area-feature";

/**
 * Forurenset grunn er et internt datasett (produktbeslutning 2026-10-03): den offentlige
 * `/omrade` verken henter eller viser det. Admin ser alle registreringene som én kompakt
 * gruppe, slik datagrunnlaget faktisk er.
 */

type Row = Parameters<typeof contaminatedFacts>[0][number];

const flate = (n: number) => ({
  type: "Polygon" as const,
  coordinates: [[[10.7, 59.9], [10.7 + n / 1e4, 59.9], [10.7 + n / 1e4, 59.9 + n / 1e4], [10.7, 59.9]]],
});

function lokalitet(overrides: {
  title: string;
  distance_m: number;
  grad: string;
  contains?: boolean;
  prosess?: string;
  oppdatert?: string;
  type?: string;
}): Row {
  return {
    id: `${overrides.title}-${overrides.distance_m}`,
    provider_id: "mdir-forurenset-grunn",
    external_id: `e${overrides.distance_m}`,
    category: "miljo",
    subtype: "forurenset_grunn",
    title: overrides.title,
    distance_m: overrides.distance_m,
    contains: overrides.contains ?? false,
    attributes: {
      paavirkningsgrad: overrides.grad,
      ...(overrides.prosess ? { prosessStatus: overrides.prosess } : {}),
      ...(overrides.type ? { lokalitetType: overrides.type } : {}),
    },
    source_url: "https://grunnforurensning.miljodirektoratet.no/",
    source_url_type: "factsheet",
    source_updated_at: overrides.oppdatert ?? null,
    centroid: { type: "Point", coordinates: [10.7, 59.9] },
    geometry: flate(overrides.distance_m),
  } as Row;
}

const grad3 = (title: string, distance_m: number, contains = false) =>
  lokalitet({ title, distance_m, grad: "ikkeAkseptabelForurensning", contains });
const gradX = (title: string, distance_m: number, contains = false) =>
  lokalitet({ title, distance_m, grad: "ukjentPåvirkning", contains });
const grad1 = (title: string, distance_m: number, contains = false) =>
  lokalitet({ title, distance_m, grad: "liteForurensning", contains });
const grad2 = (title: string, distance_m: number) =>
  lokalitet({ title, distance_m, grad: "akseptabelForurensning" });

/** Nordbergveien slik den ligger i kilden: deponi, grad 1, oppfølging uavklart, oppdatert 2010. */
const nordbergveien = lokalitet({
  title: "Nordbergveien",
  distance_m: 0,
  contains: true,
  grad: "liteForurensning",
  prosess: "uavklart",
  type: "deponi",
  oppdatert: "2010-10-12T00:00:00.000Z",
});

const seks = [
  grad3("Gammel bensinstasjon", 120),
  grad1("Tidligere verksted", 200),
  grad1("Skoletomta", 260),
  grad2("Havnelageret", 300),
  grad2("Parken", 380),
  grad2("Kaia", 460),
];

describe("Forurenset grunn i admin – alle registreringene", () => {
  const alle = (rows: Row[], radius = 500) => contaminatedFacts(rows, radius, false)!;

  it("teller grad 3 og X som oppfølging, og alt som total", () => {
    expect(alle(seks).cluster.summary).toBe("1 krever oppfølging · 6 registreringer totalt");
  });

  it("viser grad 1 og 2 i totalen, uten kort", () => {
    const { cluster } = alle([grad1("A", 100), grad2("B", 200), grad2("C", 300)]);
    expect(cluster.summary).toBe("3 registreringer · ingen vurdert til å kreve tiltak eller oppfølging");
    expect(cluster.facts).toEqual([]);
    expect(cluster.caveat).toContain("Ingen av registreringene i området er vurdert til å kreve tiltak");
  });

  it("viser Nordbergveien, fordi søkepunktet ligger i lokaliteten", () => {
    const { cluster, affectsSearchPoint } = alle([nordbergveien]);
    expect(cluster.facts.map((f) => f.headline)).toEqual(["Nordbergveien"]);
    expect(cluster.facts[0]!.sourceDateLabel).toBe("Kildedata sist oppdatert 2010");
    expect(affectsSearchPoint).toBe(false);
  });

  it("har alle registreringene bak «Se alle» og i kartet", () => {
    const { cluster, mapFeatures } = alle(seks);
    expect(cluster.overview!.toggleLabel).toBe("Se alle registreringer i området");
    expect(cluster.overview!.items).toHaveLength(6);
    expect(mapFeatures).toHaveLength(6);
  });

  it("markerer søkepunktet som berørt bare ved grad 3 eller X", () => {
    expect(alle([grad3("Under huset", 0, true)]).affectsSearchPoint).toBe(true);
    expect(alle([gradX("Under huset", 0, true)]).affectsSearchPoint).toBe(true);
    expect(alle([grad1("Under huset", 0, true)]).affectsSearchPoint).toBe(false);
  });
});

describe("Forurenset grunn er ikke del av den offentlige visningen", () => {
  /** En database som svarer med én grad 3-lokalitet under søkepunktet, og husker hva den ble spurt om. */
  function db() {
    const kall: { fn: string; categories: unknown }[] = [];
    const impl: Db = {
      kind: "pglite",
      async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
        kall.push({ fn, categories: args.categories });
        const kategorier = (args.categories as string[] | null) ?? [];
        return (fn === "features_near" && kategorier.includes("miljo") ? [grad3("Under huset", 0, true)] : []) as T[];
      },
    };
    return { impl, kall };
  }
  const sted = { lat: 59.91, lng: 10.75, radius: 500, sources: "db" as const };

  it("offentlig spør ikke etter kategorien, og viser verken seksjon, kilde eller kartflate", async () => {
    const { impl, kall } = db();
    const svar = await getAreaFacts({ ...sted, db: impl });
    expect(kall.some((k) => (k.categories as string[] | null)?.includes("miljo"))).toBe(false);
    if (svar.status !== "ok") throw new Error("forventet ok");
    expect(svar.groups.map((g) => g.sectionId)).not.toContain("forurenset-grunn");
    expect(svar.mapFeatures.filter((f) => f.category === "miljo")).toEqual([]);
    expect(JSON.stringify(svar)).not.toMatch(/forurens/i);
  });

  it("admin ber om alle registreringene og får seksjonen", async () => {
    const { impl, kall } = db();
    const svar = await getAreaFacts({ ...sted, db: impl, contaminatedScope: "alle" });
    expect(kall.some((k) => (k.categories as string[] | null)?.includes("miljo"))).toBe(true);
    if (svar.status !== "ok") throw new Error("forventet ok");
    expect(svar.groups.map((g) => g.sectionId)).toContain("forurenset-grunn");
  });

  it("seksjonen finnes fortsatt i rekkefølgen, så admin kan vise den", () => {
    expect(AREA_SECTIONS.map((s) => s.id)).toContain("forurenset-grunn");
    expect(sectionOrder({ contaminationAtSearchPoint: true, includeInternal: true })[0]!.id).toBe("forurenset-grunn");
  });
});
