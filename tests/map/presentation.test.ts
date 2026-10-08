import { describe, expect, it } from "vitest";
import { findTheme, mapFocus, themeHref, themesFor } from "@/lib/area-themes";
import { boundsAround, CLUSTER, mapChipLabel, mapTone, NEUTRAL_COLOR, POINT_STYLE } from "@/lib/map/presentation";

const temaer = themesFor(null);
const tema = (id: string) => findTheme(temaer, id)!;

describe("kartet i oversikten", () => {
  it("viser alt, men nøytralt — ingen temafarger samtidig", () => {
    expect(mapTone(null)).toEqual({ mode: "overview", color: NEUTRAL_COLOR });
    expect(mapFocus(null)).toEqual({ categories: null, plans: true });
    // Den nøytrale fargen er ikke en av temafargene.
    expect(temaer.map((t) => t.color)).not.toContain(NEUTRAL_COLOR);
  });

  it("tegner punktene mindre og svakere enn når et tema er valgt", () => {
    expect(POINT_STYLE.overview.radius).toBeLessThan(POINT_STYLE.theme.radius);
    expect(POINT_STYLE.overview.opacity).toBeLessThan(POINT_STYLE.theme.opacity);
  });
});

describe("kartet med valgt tema", () => {
  it("bruker temaets farge, og bare for det temaet", () => {
    for (const id of ["skoler", "planer", "infrastruktur", "naturfare", "servering", "friluft"]) {
      expect(mapTone(tema(id))).toEqual({ mode: "theme", color: tema(id).color });
    }
  });

  it("viser bare det temaet eier", () => {
    expect([...mapFocus(tema("infrastruktur")).categories!]).toEqual(["infrastruktur"]);
    expect([...mapFocus(tema("naturfare")).categories!]).toEqual(["grunnforhold"]);
    expect(mapFocus(tema("servering")).plans).toBe(false);
    expect(mapFocus(tema("planer")).plans).toBe(true);
    // Friluft har ingen kategori i områdefakta; hyttene kommer fra sin egen kilde.
    expect([...mapFocus(tema("friluft")).categories!]).toEqual([]);
  });

  it("gjør valgt objekt tydeligere enn resten av temaet", () => {
    expect(POINT_STYLE.selected.radius).toBeGreaterThan(POINT_STYLE.theme.radius);
    expect(POINT_STYLE.selected.halo).toBeGreaterThan(POINT_STYLE.selected.radius);
  });
});

describe("klynging", () => {
  it("løser seg opp før eiendomsoppslag slår inn på zoom 14", () => {
    // Fra zoom 14 slår et klikk i kartet opp eiendommen under. Da skal det ikke finnes klynger
    // som kan forveksles med et klikk på en tomt.
    expect(CLUSTER.maxZoom).toBeLessThan(14);
    expect(CLUSTER.radius).toBeGreaterThan(0);
  });
});

describe("merkelappen i kartet", () => {
  it("sier hva kartet viser, nøytralt i oversikten", () => {
    expect(mapChipLabel(null, 120)).toBe("Viser: alle temaer");
    expect(mapChipLabel(tema("skoler"), 12)).toBe("Viser: skoler og barnehager");
    expect(mapChipLabel(tema("planer"), 3)).toBe("Viser: planer");
  });

  it("sier fra når temaet ikke har noe i kartet — men ikke før dataene er kommet", () => {
    expect(mapChipLabel(tema("stoy"), 0)).toBe("Støy: ingen steder å vise i kartet");
    expect(mapChipLabel(tema("stoy"), 0, false)).toBe("Viser: støy");
  });
});

describe("utsnitt for temaer med funn langt unna", () => {
  const sted: [number, number] = [10.74715, 59.96646];

  it("rommer både søkepunktet og hyttene", () => {
    const b = boundsAround(sted, [
      [10.62, 60.01],
      [10.81, 59.99],
    ])!;
    expect(b).toEqual([
      [10.62, 59.96646],
      [10.81, 60.01],
    ]);
  });

  it("gir ingen grenser uten punkter, så kartet beholder radiusutsnittet", () => {
    expect(boundsAround(sted, [])).toBeNull();
  });
});

describe("tema i URL-en etter kartendringene", () => {
  it("er fortsatt en søkeparameter", () => {
    expect(themeHref("/omrade", "lat=59.9&lng=10.7", "friluft")).toBe("/omrade?lat=59.9&lng=10.7&tema=friluft");
  });
});
