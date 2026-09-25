import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb } from "@/lib/db/pglite";
import { velgKrets, type SkolekretsRad } from "@/lib/facts/skolekrets";
import { destinationPoint } from "@/lib/geo/radius";

type Db = Awaited<ReturnType<typeof createPgliteDb>>;

/**
 * Skolekrets spør «ligger punktet inne i?», ikke «hva er i nærheten?».
 * Testen sikrer at nabokretsen aldri kan bli svaret, uansett hvor nær den ligger.
 */

const INNE = { lat: 59.92992, lng: 10.71488 };

function firkant(distanseM: number, halvsideM = 100) {
  const [lng, lat] =
    distanseM === 0 ? [INNE.lng, INNE.lat] : destinationPoint(INNE.lat, INNE.lng, distanseM, 90);
  const dLat = halvsideM / 111_195;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - dLng, lat - dLat],
        [lng + dLng, lat - dLat],
        [lng + dLng, lat + dLat],
        [lng - dLng, lat + dLat],
        [lng - dLng, lat - dLat],
      ],
    ],
  };
}

const rad = (externalId: string, geometry: unknown) => ({
  external_id: externalId,
  category: "skolekrets",
  subtype: "inntaksomrade_barneskole",
  title: externalId,
  geometry,
  attributes: { skretsnavn: externalId, nivaa: "barneskole", veiledende: true, kuratert: true },
  source_url: "https://od2.pbe.oslo.kommune.no/xkart/skoler/",
  source_url_type: "provider_page",
  source_updated_at: null,
  content_hash: `${externalId}-1`,
});

/** Samme kall som lib/facts/skolekrets gjør i produksjon. */
const slaaOpp = (db: Db, lat: number, lng: number) =>
  db.rpc<SkolekretsRad>("features_near", {
    lat,
    lng,
    radius_m: 1,
    categories: ["skolekrets"],
    max_results: 5,
  });

describe("skolekrets i databasen", { timeout: 30_000 }, () => {
  let db: Db;

  beforeAll(async () => {
    db = await createPgliteDb();
    await db.rpc("upsert_area_features", {
      p_provider_id: "oslo-skolekrets",
      p_features: [rad("Nordberg", firkant(0)), rad("Tåsen", firkant(400))],
      p_synced_at: new Date().toISOString(),
    });
  });

  it("tar imot den nye kategorien", async () => {
    const alle = await slaaOpp(db, INNE.lat, INNE.lng);
    expect(alle.length).toBeGreaterThan(0);
  });

  it("finner kretsen som dekker punktet, og bare den", async () => {
    const resultat = velgKrets(await slaaOpp(db, INNE.lat, INNE.lng));
    expect(resultat.status).toBe("ok");
    expect(resultat.status === "ok" && resultat.krets).toBe("Nordberg");
  });

  it("gir «utenfor» for et punkt uten dekning, selv med en krets i nærheten", async () => {
    // 250 m øst: mellom de to firkantene, dekket av ingen.
    const [lng, lat] = destinationPoint(INNE.lat, INNE.lng, 250, 90);
    expect(velgKrets(await slaaOpp(db, lat, lng)).status).toBe("utenfor");
  });

  it("gir «utenfor» langt utenfor Oslo — da vises ingen notis", async () => {
    // Trondheim. Kilden dekker bare Oslo, så her skal det ikke finnes noe som helst.
    expect(velgKrets(await slaaOpp(db, 63.4305, 10.3951)).status).toBe("utenfor");
  });

  it("melder flertydig når to kretser overlapper punktet", async () => {
    await db.rpc("upsert_area_features", {
      p_provider_id: "oslo-skolekrets",
      p_features: [rad("Overlapp", firkant(0, 120))],
      p_synced_at: new Date().toISOString(),
    });
    const resultat = velgKrets(await slaaOpp(db, INNE.lat, INNE.lng));
    expect(resultat.status).toBe("flertydig");
    expect(resultat.status === "flertydig" && [...resultat.kretser].sort()).toEqual(["Nordberg", "Overlapp"]);
  });
});
