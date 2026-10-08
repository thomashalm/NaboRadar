import { describe, expect, it, vi } from "vitest";
import { goToSection } from "@/components/area/AreaSummary";

/**
 * Radene i «Området i korte trekk» skal faktisk føre et sted. Prosjektet har ingen DOM i testene,
 * så målet er en liten etterligning med akkurat det funksjonen bruker.
 */
function fakeDocument(ids: string[]) {
  const details = { setAttribute: vi.fn() };
  const elements = new Map(
    ids.map((id) => [
      id,
      {
        querySelector: vi.fn((selector: string) => (selector === "details" ? details : null)),
        scrollIntoView: vi.fn(),
        setAttribute: vi.fn(),
        focus: vi.fn(),
      },
    ]),
  );
  return { doc: { getElementById: (id: string) => elements.get(id) ?? null } as unknown as Document, elements, details };
}

describe("goToSection", () => {
  it("ruller til seksjonen, åpner den og flytter fokus dit", () => {
    const { doc, elements, details } = fakeDocument(["om-saker"]);
    expect(goToSection("om-saker", doc)).toBe(true);

    const target = elements.get("om-saker")!;
    expect(target.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(details.setAttribute).toHaveBeenCalledWith("open", "");
    expect(target.setAttribute).toHaveBeenCalledWith("tabindex", "-1");
    // Fokus skal ikke rulle en gang til og avbryte den rolige rullingen.
    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("lar lenken oppføre seg som en vanlig lenke når seksjonen ikke finnes ennå", () => {
    const { doc } = fakeDocument([]);
    expect(goToSection("om-stoy", doc)).toBe(false);
  });
});
