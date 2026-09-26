import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapSelectionProvider } from "@/components/area/map-selection";
import { ResearchFunn } from "@/components/admin/ResearchFunn";
import type { NearbyResearch } from "@/lib/admin/research-types";

/**
 * Research-kortet som trykkflate.
 *
 * Prosjektet har ingen DOM-testoppsett, så et ekte klikk simuleres ikke her. Det som testes er
 * koblingen kortet hviler på: at et funn med kartpunkt rendres som en knapp som velger nettopp
 * det funnet, at et funn uten kartpunkt ikke gjør det, og at valgt kort ser valgt ut.
 */
const FUNN: NearbyResearch = {
  id: "a607dcb4-9c27-4dd8-b77b-63a31ea038fd",
  category: "Omsorg / bofellesskap",
  subcategory: null,
  title: "Mulig omsorgsrelatert virksomhet",
  description: null,
  address: "Egne Hjems vei 5",
  municipality: "Bærum",
  latitude: 59.919488,
  longitude: 10.597865,
  distance_m: 32.7,
  verification_status: "investigated_not_confirmed",
  operational_status: "unknown",
  sensitivity: "internal_only",
  confidence: "low",
  interest_level: "medium",
  source_count: 4,
};

function render(options: { ids: string[]; selectedId?: string | null }) {
  return renderToStaticMarkup(
    <MapSelectionProvider selectedId={options.selectedId ?? null} onSelect={() => {}} ids={options.ids}>
      <ResearchFunn funn={[FUNN]} radiusM={1000} />
    </MapSelectionProvider>,
  );
}

describe("research-kortet", () => {
  it("er en trykkflate når funnet finnes i kartet", () => {
    const html = render({ ids: [FUNN.id] });
    expect(html).toContain("Vis Mulig omsorgsrelatert virksomhet i kartet");
    expect(html).toContain('aria-pressed="false"');
    // Knappen dekker kortet, ikke bare tittelen.
    expect(html).toMatch(/<button[^>]*class="absolute inset-0/);
  });

  it("viser valgt funn tydelig", () => {
    const html = render({ ids: [FUNN.id], selectedId: FUNN.id });
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("border-accent");
  });

  it("later ikke som et funn uten kartpunkt kan velges", () => {
    const html = render({ ids: [] });
    expect(html).not.toContain("<button");
    expect(html).toContain("uten kartpunkt");
  });

  it("har lenken til funnet over trykkflaten", () => {
    const html = render({ ids: [FUNN.id] });
    // Lenken må ligge over knappen, ellers ville «Åpne funnet» bare valgt punktet i kartet.
    expect(html).toMatch(/z-20[^>]*>[\s\S]*?Åpne funnet/);
    expect(html).toContain(`/admin/research/${FUNN.id}`);
  });

  it("viser avstand, kategori og de interne vurderingene på kortet", () => {
    const html = render({ ids: [FUNN.id] });
    for (const tekst of ["30 m unna", "Omsorg", "Ukjent status", "LAV SIKKERHET", "INTERN", "4 kilder"]) {
      expect(html).toContain(tekst);
    }
  });
});
