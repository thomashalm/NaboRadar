import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// sitemap og robots henter SITE_URL fra app/layout.tsx, som laster en webfont. Fonten har
// ingenting med denne testen å gjøre, og next/font kan ikke kjøre utenfor Next-bygget.
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "--font-geist", className: "font" }) }));

const { default: sitemap } = await import("@/app/sitemap");
const { default: robots } = await import("@/app/robots");
import { AREA_CATEGORIES } from "@/types/area-feature";
import { RESEARCH_CATEGORIES } from "@/lib/admin/research-types";

/**
 * Research skal aldri kunne sive ut i den offentlige delen av produktet.
 *
 * Tilgangen håndheves i databasen — det er testet i tests/db/admin-research.test.ts. Her testes
 * den andre halvdelen: at den offentlige *koden* ikke har noen vei inn til research i det hele
 * tatt, og at SEO-flatene ikke kjenner den.
 */
describe("research holdes utenfor det offentlige", () => {
  const les = (sti: string) => readFileSync(sti, "utf8");

  it("nevner ikke research i sitemap", () => {
    const urler = sitemap().map((e) => String(e.url));
    expect(urler.some((u) => /research|admin/i.test(u))).toBe(false);
    // Positiv kontroll: sitemappen har faktisk innhold, så testen over ikke er tom.
    expect(urler.length).toBeGreaterThan(0);
  });

  it("holder admin utenfor robots.txt", () => {
    const regler = robots().rules;
    const disallow = (Array.isArray(regler) ? regler : [regler]).flatMap((r) =>
      typeof r.disallow === "string" ? [r.disallow] : (r.disallow ?? []),
    );
    expect(disallow).toContain("/admin");
  });

  it("gir den offentlige resultatsiden ingen vei til research", () => {
    const side = les("app/omrade/page.tsx");
    expect(side).not.toMatch(/research/i);
    expect(side).not.toMatch(/internalFeatures/);
    expect(side).not.toMatch(/InternSeksjon/);
  });

  it("holder research-kategoriene utenfor de offentlige kategoriene", () => {
    // area_features og research deler ikke kategorirom. Skulle de begynne å overlappe, ville
    // en research-kategori kunne se ut som noe det offentlige oppslaget kjenner.
    for (const kategori of RESEARCH_CATEGORIES) {
      expect(AREA_CATEGORIES as readonly string[]).not.toContain(kategori);
    }
  });

  it("leser aldri research i det offentlige faktalaget", () => {
    for (const fil of ["lib/facts/queries.ts", "lib/area-view.ts", "components/area/AreaFacts.tsx"]) {
      expect(les(fil)).not.toMatch(/research|admin_research/i);
    }
  });

  it("henter research bare med admins egen sesjon", () => {
    // Ingen skrivenøkkel i webappen: hvert kall går gjennom `session.client`, som er brukerens
    // egen sesjon, slik at is_admin() i databasen er det som avgjør.
    const lag = les("lib/admin/research.ts");
    expect(lag).toMatch(/^import "server-only";/m);
    expect(lag).not.toMatch(/SECRET|SERVICE_ROLE|createSupabaseServiceClient/);
  });
});
