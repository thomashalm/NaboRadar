import type { MetadataRoute } from "next";
import { buildHutHref } from "@/lib/huts/href";
import { listPublicHuts } from "@/lib/huts/queries";
import { SITE_URL } from "./layout";

/**
 * Bare sider som skal stå alene i et søkeresultat.
 *
 * /omrade og /sak er bevisst utelatt: /omrade er ett søk per adresse og er noindex, og
 * saksidene finnes det over tusen av — de oppdages via lenker, ikke via sitemap.
 *
 * Hyttekartet og hver hytte som vises offentlig er med. Lista hentes uten innlogging, så
 * avviste, skjulte og upubliserte hytter aldri kommer med. Ingen lastmod på hyttene: Kartverkets
 * dato sier ikke når vi sist la til forvalter eller lenke. Ingen priority/changefreq heller.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const nå = new Date();
  const hytter = await listPublicHuts().catch(() => []);
  return [
    { url: new URL("/", SITE_URL).toString(), lastModified: nå, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/skolekrets", SITE_URL).toString(), lastModified: nå, changeFrequency: "monthly", priority: 0.8 },
    { url: new URL("/tilfluktsrom", SITE_URL).toString(), lastModified: nå, changeFrequency: "monthly", priority: 0.8 },
    ...(hytter.length > 0
      ? [{ url: new URL("/hytter", SITE_URL).toString() }, ...hytter.map((hut) => ({ url: new URL(buildHutHref(hut), SITE_URL).toString() }))]
      : []),
  ];
}
