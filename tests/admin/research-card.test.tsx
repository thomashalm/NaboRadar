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
  item_type: "finding",
  why_interesting: null,
  notes: null,
  public_candidate: false,
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
  it("er en trykkflate for kartvalg når funnet finnes i kartet", () => {
    const html = render({ ids: [FUNN.id] });
    expect(html).toContain("Vis Mulig omsorgsrelatert virksomhet i kartet");
    expect(html).toContain('aria-pressed="false"');
  });

  it("viser valgt funn tydelig", () => {
    const html = render({ ids: [FUNN.id], selectedId: FUNN.id });
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("border-accent");
  });

  it("later ikke som et funn uten kartpunkt kan velges", () => {
    const html = render({ ids: [] });
    expect(html).not.toContain("<button");
    // Detaljene skal fortsatt kunne åpnes.
    expect(html).toContain("Detaljer");
  });

  it("holder kartvalg og detaljer atskilt", () => {
    const html = render({ ids: [FUNN.id] });
    // Utvideren ligger utenfor knappen, ellers ville et kartvalg åpnet kortet.
    const knapp = html.slice(html.indexOf("<button"), html.indexOf("</button>"));
    expect(knapp).not.toContain("<details");
    expect(knapp).not.toContain("Detaljer");
    // Og kortet er lukket som standard.
    expect(html).not.toContain("<details open");
  });

  it("viser det som trengs for å skanne, i kollapset tilstand", () => {
    const html = render({ ids: [FUNN.id] });
    const kollapset = html.slice(0, html.indexOf("<details"));
    for (const tekst of ["30 M UNNA", "Mulig omsorgsrelatert virksomhet", "Egne Hjems vei 5",
                         "MIDDELS INTERESSE", "LAV SIKKERHET", "4 KILDER", "INTERN"]) {
      expect(kollapset).toContain(tekst);
    }
    // Kategorien står i gruppeoverskriften, og gjentas ikke på hvert kort.
    expect(kollapset).toContain(">Omsorg<");
    expect(kollapset).not.toContain("OMSORG ·");
  });

  it("viser ikke tekniske databaseverdier", () => {
    const html = render({ ids: [FUNN.id] });
    // «Ukjent status» er ikke informasjon, og opphav og følsomhet hører ikke hjemme på kortet.
    expect(html).not.toMatch(/ukjent status/i);
    expect(html).not.toMatch(/manuelt/i);
    expect(html).not.toMatch(/internal_only/);
    expect(html).not.toMatch(/investigated_not_confirmed/);
  });

  it("skriver «Omfatter valgt sted» når søkepunktet ligger på funnet", () => {
    const påStedet = { ...FUNN, distance_m: 0 };
    const html = renderToStaticMarkup(
      <MapSelectionProvider selectedId={null} onSelect={() => {}} ids={[påStedet.id]}>
        <ResearchFunn funn={[påStedet]} radiusM={1000} />
      </MapSelectionProvider>,
    );
    expect(html).toContain("OMFATTER VALGT STED");
  });

  it("har lenken til funnet i detaljene", () => {
    const html = render({ ids: [FUNN.id] });
    expect(html).toContain(`/admin/research/${FUNN.id}`);
    expect(html).toContain("Åpne funnet");
  });
});
