import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PGlite (lokal dev-database) er WASM og må lastes fra node_modules, ikke bundles.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-postgis"],
};

export default nextConfig;
