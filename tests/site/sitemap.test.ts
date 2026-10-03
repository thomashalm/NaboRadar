import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "--font-geist", className: "font" }) }));
vi.mock("@/lib/huts/queries", () => ({
  listPublicHuts: async () => [
    { id: "a4fbf722-0000-0000-0000-000000000000", name: "Aursjobu", municipalityNumber: "3433" },
    { id: "740886aa-0000-0000-0000-000000000000", name: "Fulehuk", municipalityNumber: "3911" },
    { id: "11111111-0000-0000-0000-000000000000", name: "Uten kommune", municipalityNumber: null },
  ],
}));
// Kommuneregisteret svarer ikke i testen; øyeblikksbildet brukes.
vi.mock("@/lib/http", () => ({
  fetchJson: async () => {
    throw new Error("nede");
  },
}));
vi.spyOn(console, "warn").mockImplementation(() => {});

const { default: sitemap } = await import("@/app/sitemap");

describe("sitemapen", () => {
  it("har fylkessidene for fylker med hytter, og hver hytte", async () => {
    const urler = (await sitemap()).map((e) => String(e.url));
    expect(urler).toContain("https://naboradar.no/hytter");
    expect(urler).toContain("https://naboradar.no/hytter/fylke/innlandet");
    expect(urler).toContain("https://naboradar.no/hytter/fylke/vestfold");
    expect(urler.filter((u) => u.includes("/hytter/fylke/"))).toHaveLength(2);
    expect(urler).toContain("https://naboradar.no/hytter/aursjobu-a4fbf722");
    // En hytte uten kommune har sin egen side, men gir ingen fylkesside.
    expect(urler).toContain("https://naboradar.no/hytter/uten-kommune-11111111");
  });

  it("sender ingen kunstig lastmod, priority eller changefreq", async () => {
    for (const oppføring of await sitemap()) {
      expect(oppføring).not.toHaveProperty("lastModified");
      expect(oppføring).not.toHaveProperty("priority");
      expect(oppføring).not.toHaveProperty("changeFrequency");
    }
  });
});
