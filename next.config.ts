import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PGlite (lokal dev-database) er WASM og må lastes fra node_modules, ikke bundles.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-postgis"],
  // …og skal aldri med i produksjonsbundlen (~44 MB), heller ikke den lokale databasen i .data/.
  // lib/db velger aldri PGlite når NODE_ENV=production.
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/**", ".data/**"] },
};

export default nextConfig;
