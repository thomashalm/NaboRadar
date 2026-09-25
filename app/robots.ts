import type { MetadataRoute } from "next";

import { SITE_URL } from "./layout";

/**
 * Drifts- og diagnostikksider skal ikke krypes. Alt annet er åpent — også for søkeroboter
 * som OAI-SearchBot og PerplexityBot, som leser vanlig HTML og følger samme regler som
 * Googlebot. Vi blokkerer ingen av dem: poenget er at tjenesten skal være lett å finne.
 *
 * /omrade krypes, men er noindex. Da følges lenkene videre uten at hver enkelt adresse
 * havner i indeksen.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dev", "/api/"] }],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL.host,
  };
}
