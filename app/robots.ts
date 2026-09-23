import type { MetadataRoute } from "next";

/** Drifts- og diagnostikksider skal ikke indekseres. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dev", "/api/"] }],
  };
}
