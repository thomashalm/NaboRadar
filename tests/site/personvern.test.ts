import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { footerVises, KONTAKT_EPOST } from "@/lib/site";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "--font-geist", className: "font" }) }));
vi.mock("@/lib/huts/queries", () => ({ listPublicHuts: async () => [] }));
const { default: sitemap } = await import("@/app/sitemap");

describe("bunntekst og personvern", () => {
  it("viser bunnteksten på offentlige sider, ikke i driften", () => {
    for (const sti of ["/", "/hytter", "/hytter/aursjobu-a4fbf722", "/omrade", "/personvern", "/administrasjon"]) {
      expect(footerVises(sti), sti).toBe(true);
    }
    for (const sti of ["/admin", "/admin/hytter", "/dev", "/dev/kart"]) expect(footerVises(sti), sti).toBe(false);
  });

  it("har personvernsiden i sitemapen", async () => {
    const urler = (await sitemap()).map((e) => String(e.url));
    expect(urler).toContain("https://naboradar.no/personvern");
  });

  it("knytter ikke NaboRadar til et foretak eller en adresse", () => {
    const tekst = readFileSync("app/personvern/page.tsx", "utf8") + readFileSync("components/SiteFooter.tsx", "utf8");
    expect(tekst).not.toMatch(/Fink|org\.?\s?nr|organisasjonsnummer|\bAS\b/i);
    expect(KONTAKT_EPOST).toBe("kontakt@naboradar.no");
    // Navnet står på personvernsiden, ikke i bunnteksten.
    expect(readFileSync("components/SiteFooter.tsx", "utf8")).not.toMatch(/Halmø/);
  });
});
