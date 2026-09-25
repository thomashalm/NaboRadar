import type { NextConfig } from "next";

/** Origin fra en URL i miljøet, hvis den er satt og gyldig. */
function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const tileOrigin = origin(process.env.NEXT_PUBLIC_MAP_TILE_URL) ?? "https://cache.kartverket.no";
const supabaseOrigin = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Content-Security-Policy.
 *
 * Kjøres som Report-Only inntil vi har sett at den ikke tar noe med seg. Den er satt opp
 * etter hva siden faktisk laster: alt er selvhostet — MapLibre fra public/vendor, Geist
 * hentes ned av next/font ved bygg — så de eneste eksterne vertene er kartflisene og
 * Supabase. `unsafe-inline` på script er Next.js sin egen oppstartskode; å bytte til nonce
 * krever at middleware kjører på hver side, og det er et større valg enn dette.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${tileOrigin}`,
  `connect-src 'self' ${tileOrigin}${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "font-src 'self'",
  // MapLibre laster sin egen worker fra /vendor og bruker blob: internt.
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // Klikkjacking. NaboRadar skal aldri ligge i en ramme, og ingenting bygger på at den kan.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // URL-en inneholder lat/lng og en søkt adresse. Den skal ikke følge med til andre nettsteder.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Vi ber aldri om noe av dette. Å si det eksplisitt gjør det synlig hvis noe endrer seg.
  {
    key: "Permissions-Policy",
    value: "geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // PGlite (lokal dev-database) er WASM og må lastes fra node_modules, ikke bundles.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-postgis"],
  // …og skal aldri med i produksjonsbundlen (~44 MB), heller ikke den lokale databasen i .data/.
  // lib/db velger aldri PGlite når NODE_ENV=production.
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/**", ".data/**"] },
};

export default nextConfig;
