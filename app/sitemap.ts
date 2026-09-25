import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

/**
 * Bare sider som skal stå alene i et søkeresultat.
 *
 * /omrade og /sak er bevisst utelatt: /omrade er ett søk per adresse og er noindex, og
 * saksidene finnes det over tusen av — de oppdages via lenker, ikke via sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const nå = new Date();
  return [
    { url: new URL("/", SITE_URL).toString(), lastModified: nå, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/skolekrets", SITE_URL).toString(), lastModified: nå, changeFrequency: "monthly", priority: 0.8 },
    { url: new URL("/tilfluktsrom", SITE_URL).toString(), lastModified: nå, changeFrequency: "monthly", priority: 0.8 },
  ];
}
