/**
 * QA for støycachen mot den ekte kilden: `npm run qa:stoy-cache`.
 *
 * For hvert sted: første kall går til Miljødirektoratet, andre kall skal komme fra cachen og gi
 * nøyaktig de samme funnene og den samme teksten. Til slutt simuleres en gammel rad og en kilde
 * som ikke svarer.
 *
 * Cachen ligger i en PGlite-database i minnet med de samme migrasjonene som Supabase. Skriptet
 * rører ikke produksjon og lagrer ingenting.
 */
import { createPgliteDb } from "@/lib/db/pglite";
import { StrategiskStoyLookup } from "@/lib/facts/lookups/stoy";
import type { AreaLookup, LookupHit } from "@/lib/facts/lookups/types";
import { CachedNoiseLookup, createDbNoiseCacheStore, noiseCacheKey } from "@/lib/facts/noise-cache";
import { describeFact } from "@/lib/facts/wording";

const STEDER = [
  { navn: "Kirkeveien 60, Oslo (veistøy)", lat: 59.92852, lng: 10.71432 },
  { navn: "Majorstuen stasjon, Oslo (bane)", lat: 59.92975, lng: 10.71489 },
  { navn: "Langmyrgrenda 26, Oslo (50–54 dB)", lat: 59.96623, lng: 10.74723 },
  { navn: "Langmyrgrenda 26C, Oslo (20 cm utenfor båndet)", lat: 59.96646, lng: 10.74715 },
  { navn: "Vinstra (utenfor kartleggingen)", lat: 61.83, lng: 9.4 },
] as const;

const TOKEN = "qa-token-som-bare-finnes-i-denne-kjoringen-0123456789";
const tekst = (hits: LookupHit[]) =>
  hits.map((h) => {
    const t = describeFact({ subtype: h.subtype, title: h.title, attributes: h.attributes, contains: h.contains });
    return t ? [t.headline, ...t.details].join(" | ") : `(${h.subtype})`;
  });

async function main() {
  const db = await createPgliteDb();
  await db.pg.query(`insert into public.app_write_tokens (name, token_sha256) values ('noise_cache', sha256(convert_to($1, 'UTF8')))`, [TOKEN]);
  const store = createDbNoiseCacheStore(async () => db, TOKEN);
  const kilde = new StrategiskStoyLookup();
  let kall = 0;
  const telt: AreaLookup = { ...kilde, id: kilde.id, name: kilde.name, owner: kilde.owner, category: kilde.category, run: (c) => (kall++, kilde.run(c)) };
  const nede: AreaLookup = { ...telt, run: async () => { throw new Error("simulert tidsavbrudd"); } };
  let avvik = 0;

  for (const sted of STEDER) {
    const punkt = { lat: sted.lat, lng: sted.lng, radiusM: 1000 };
    console.log(`\n== ${sted.navn}  [${noiseCacheKey(sted.lat, sted.lng)}]`);
    const cached = new CachedNoiseLookup(telt, store);
    try {
      const før = kall;
      let t = performance.now();
      const første = await cached.runDetailed(punkt);
      const kald = Math.round(performance.now() - t);
      t = performance.now();
      const andre = await cached.runDetailed(punkt);
      const varm = Math.round(performance.now() - t);
      const likt = JSON.stringify(første.hits) === JSON.stringify(andre.hits) && JSON.stringify(tekst(første.hits)) === JSON.stringify(tekst(andre.hits));
      if (!likt || første.origin !== "source" || andre.origin !== "cache" || kall - før !== 1) avvik++;
      console.log(`   1. kall: ${første.origin}, ${kald} ms   2. kall: ${andre.origin}, ${varm} ms   kildekall: ${kall - før}   identisk: ${likt ? "ja" : "NEI"}`);
      for (const linje of tekst(første.hits)) console.log(`   · ${linje}`);
      const rad = await store.get(noiseCacheKey(sted.lat, sted.lng));
      console.log(`   rad: vei=${rad?.roadState}/${rad?.roadCoverage} (${rad?.sourceRoundRoad})  bane=${rad?.railState}/${rad?.railCoverage} (${rad?.sourceRoundRail})`);

      // Gjør raden gammel, og la kilden feile: det lagrede svaret skal vises, og raden stå urørt.
      await db.pg.query(`update public.noise_cache set fetched_at = now() - interval '120 days' where cache_key = $1`, [noiseCacheKey(sted.lat, sted.lng)]);
      const gammel = await store.get(noiseCacheKey(sted.lat, sted.lng));
      t = performance.now();
      const fallback = await new CachedNoiseLookup(nede, store).runDetailed(punkt);
      const ms = Math.round(performance.now() - t);
      const urørt = JSON.stringify(await store.get(noiseCacheKey(sted.lat, sted.lng))) === JSON.stringify(gammel);
      const ok = fallback.origin === "stale-cache" && JSON.stringify(fallback.hits) === JSON.stringify(første.hits) && urørt;
      if (!ok) avvik++;
      console.log(`   gammel rad + kilde nede: ${fallback.origin}, ${ms} ms, rad urørt: ${urørt ? "ja" : "NEI"}`);
    } catch (error) {
      avvik++;
      console.log(`   KILDEN SVARTE IKKE: ${error instanceof Error ? error.message.slice(0, 140) : error}`);
    }
  }

  console.log(avvik === 0 ? "\nAlt stemmer." : `\n${avvik} avvik eller steder uten svar.`);
  process.exit(avvik === 0 ? 0 : 1);
}

void main();
