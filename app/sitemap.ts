import type { MetadataRoute } from "next";
import { municipalityNames } from "@/lib/geo/municipalities";
import { countyCounts, countyHref } from "@/lib/huts/counties";
import { buildHutHref } from "@/lib/huts/href";
import { listPublicHuts } from "@/lib/huts/queries";
import { SITE_URL } from "./layout";

/**
 * Bare sider som skal stå alene i et søkeresultat.
 *
 * /omrade og /sak er bevisst utelatt: /omrade er ett søk per adresse og er noindex, og
 * saksidene finnes det over tusen av — de oppdages via lenker, ikke via sitemap.
 *
 * Hyttekartet, fylkessidene og hver hytte som vises offentlig er med. Lista hentes uten
 * innlogging, så avviste, skjulte og upubliserte hytter aldri kommer med; fylkene er de som har
 * minst én slik hytte, regnet fra samme liste.
 *
 * Ingen `lastmod`, `priority` eller `changefreq` (ADR 014). Vi har ingen meningsfull endringsdato
 * for disse sidene: tidspunktet sitemapen ble laget, er ikke når siden endret seg, og Kartverkets
 * dato sier ikke når vi sist la til forvalter eller lenke. Et falskt signal er verre enn ingen.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (sti: string) => ({ url: new URL(sti, SITE_URL).toString() });
  const hytter = await listPublicHuts().catch(() => []);
  const fylker =
    hytter.length > 0
      ? countyCounts(
          hytter.map((hut) => ({ municipalityNumber: hut.municipalityNumber, huts: 1 })),
          await municipalityNames(),
        ).counties
      : [];
  return [
    url("/"),
    url("/skolekrets"),
    url("/tilfluktsrom"),
    url("/personvern"),
    ...(hytter.length > 0
      ? [url("/hytter"), ...fylker.map((f) => url(countyHref(f.county))), ...hytter.map((hut) => url(buildHutHref(hut)))]
      : []),
  ];
}
