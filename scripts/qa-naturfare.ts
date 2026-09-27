/**
 * npm run qa:naturfare — sjekker naturfare-oppslagene mot ekte kilder og kjente adresser.
 *
 * Finnes fordi feilene i dette laget ikke er synlige i en enhetstest: begge de reelle feilene vi
 * fant ble oppdaget her. NVEs JordFlomskredAktsomhet lag 0 er et rasterisert oversiktslag som ga
 * treff overalt — også på flat bygrunn i Oslo — og Kartverkets `Dekningsområde` dekker praktisk
 * talt hele landet, så «ikke berørt av stormflo» dukket opp på Elverum.
 *
 * Stedene under er valgt for å dekke hver tilstand modellen kan havne i. Kjør den etter endringer
 * i lagvalg, terskler eller formuleringer.
 */
import { KartverketStormfloLookup, NguRadonLookup, NveFlomLookup, NveSkredLookup } from "@/lib/facts/lookups/naturfare";
import { NveKvikkleireAktsomhetLookup } from "@/lib/facts/lookups/nve";
import { describeFact } from "@/lib/facts/wording";

const STEDER: { navn: string; lat: number; lng: number }[] = [
  { navn: "Bergen, Store Lungegårdsvann (verifisert i stormflosone)", lat: 60.382373, lng: 5.329129 },
  { navn: "Kvinesdal/Feda, punkt i 200-årsflomsone", lat: 58.29943, lng: 7.35622 },
  { navn: "Elverum ved Glomma (flomsonekartlagt, utenfor sone)", lat: 60.8817, lng: 11.5623 },
  { navn: "Oslo, Grünerløkka", lat: 59.9235, lng: 10.759 },
  { navn: "Tromsø sentrum", lat: 69.6492, lng: 18.9553 },
  { navn: "Åndalsnes (bratt terreng)", lat: 62.5675, lng: 7.6875 },
  { navn: "Geiranger", lat: 62.1011, lng: 7.2065 },
  { navn: "Lillestrøm sentrum", lat: 59.9558, lng: 11.0493 },
];

const oppslag = [
  new NveKvikkleireAktsomhetLookup(),
  new NveFlomLookup(),
  new NveSkredLookup(),
  new NguRadonLookup(),
  new KartverketStormfloLookup(),
];

for (const sted of STEDER) {
  const t0 = performance.now();
  const resultater = await Promise.allSettled(
    oppslag.map(async (o) => ({ id: o.id, hits: await o.run({ lat: sted.lat, lng: sted.lng, radiusM: 1000 }) })),
  );
  const ms = Math.round(performance.now() - t0);
  console.log(`\n■ ${sted.navn}  (${sted.lat}, ${sted.lng})  ${ms} ms`);
  for (const r of resultater) {
    if (r.status === "rejected") {
      console.log(`   FEIL: ${String(r.reason).slice(0, 90)}`);
      continue;
    }
    for (const h of r.value.hits) {
      const tekst = describeFact({ subtype: h.subtype, title: h.title, attributes: h.attributes, contains: h.contains });
      console.log(`   ${tekst ? tekst.headline : `(ingen tekst for ${h.subtype})`}`);
      if (tekst?.details.length) console.log(`      ${tekst.details[0]!.slice(0, 110)}`);
    }
    if (r.value.hits.length === 0) console.log(`   ${r.value.id}: ingen uttalelse`);
  }
}
