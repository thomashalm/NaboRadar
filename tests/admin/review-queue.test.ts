import { describe, expect, it } from "vitest";
import {
  HURTIGFILTRE,
  STANDARDFILTER,
  antallEkstraFiltre,
  hurtigErAktiv,
  køHref,
  lesKøfilter,
  skrivKøfilter,
} from "@/lib/admin/review-queue-filters";
import {
  AKTUELLE_STATES,
  DUE_SOON_DAGER,
  REVIEW_REASONS,
  REVIEW_REASON_LABEL,
  REVIEW_STATES,
  REVIEW_STATE_LABEL,
  forklarNesteReview,
  grunnlinje,
  nårReview,
  sistKontrollert,
} from "@/lib/admin/review-types";

/**
 * Køfiltrene og forklaringene.
 *
 * URL-en er tilstanden: et utvalg skal kunne bokmerkes og deles, og en ødelagt URL skal gi en
 * brukbar kø framfor en tom skjerm. Forklaringene testes fordi de er hele poenget med å ikke ha
 * en ugjennomsiktig score — en dato uten begrunnelse er en dato ingen stoler på.
 */
describe("køfilter fra URL", () => {
  it("viser det som er aktuelt nå uten parametre", () => {
    const f = lesKøfilter({});
    expect(f.states).toEqual(AKTUELLE_STATES);
    expect(f.side).toBe(1);
    expect(f.reasons).toEqual([]);
  });

  it("leser og skriver samme filter", () => {
    const f = lesKøfilter({
      state: "overdue,due_soon",
      grunn: "planned_project,public_candidate",
      sikkerhet: "low",
      kommune: "Narvik",
      q: "datasenter",
      side: "3",
    });
    expect(f.states).toEqual(["overdue", "due_soon"]);
    expect(f.reasons).toEqual(["planned_project", "public_candidate"]);
    expect(f.confidence).toEqual(["low"]);
    expect(f.kommune).toBe("Narvik");
    expect(f.side).toBe(3);

    const tilbake = lesKøfilter(Object.fromEntries(skrivKøfilter(f)));
    expect(tilbake).toEqual(f);
  });

  it("faller tilbake til standarden på ugyldige verdier", () => {
    const f = lesKøfilter({ state: "tull,noe-annet", grunn: "finnes_ikke", side: "-4" });
    expect(f.states).toEqual(AKTUELLE_STATES);
    expect(f.reasons).toEqual([]);
    expect(f.side).toBe(1);
  });

  it("holder standarden ute av URL-en", () => {
    expect(skrivKøfilter(STANDARDFILTER).toString()).toBe("");
    expect(køHref(STANDARDFILTER)).toBe("/admin/research/review");
  });

  it("lar eksplisitte parametre vinne over hurtigfilteret", () => {
    const f = lesKøfilter({ vis: "forsinket", state: "due_soon" });
    expect(f.states).toEqual(["due_soon"]);
  });

  it("gjenkjenner det aktive hurtigfilteret", () => {
    for (const h of HURTIGFILTRE) {
      const f = lesKøfilter({ vis: h.slug });
      expect(hurtigErAktiv(h, f)).toBe(true);
    }
    // Et annet filter skal ikke se ut som «forsinket».
    const forsinket = HURTIGFILTRE.find((h) => h.slug === "forsinket")!;
    expect(hurtigErAktiv(forsinket, lesKøfilter({}))).toBe(false);
  });

  it("teller ekstrafiltre for «Filtre (n)»", () => {
    expect(antallEkstraFiltre(lesKøfilter({}))).toBe(0);
    expect(antallEkstraFiltre(lesKøfilter({ kommune: "Oslo", sikkerhet: "low" }))).toBe(2);
  });

  it("dekker alle hurtigfiltre med gyldige tilstander og grunner", () => {
    for (const h of HURTIGFILTRE) {
      for (const s of h.filter.states ?? []) expect(REVIEW_STATES).toContain(s);
      for (const r of h.filter.reasons ?? []) expect(REVIEW_REASONS).toContain(r);
    }
  });
});

describe("forklaringene", () => {
  it("sier hvorfor datoen er der den er", () => {
    const tekst = forklarNesteReview({
      review_mode: "policy",
      review_interval_days: 45,
      review_reasons: ["planned_project", "high_interest"],
      next_review_at: "2026-11-15",
    });
    expect(tekst).toContain("45 dagers intervall");
    expect(tekst).toContain(REVIEW_REASON_LABEL.planned_project);
  });

  it("forklarer overstyring med begrunnelsen, ikke med policyen", () => {
    expect(
      forklarNesteReview({
        review_mode: "manual",
        review_interval_days: 90,
        review_reasons: [],
        next_review_at: "2027-01-01",
        review_mode_note: "Avtalt med kommunen",
      }),
    ).toContain("Avtalt med kommunen");

    expect(
      forklarNesteReview({
        review_mode: "none",
        review_interval_days: null,
        review_reasons: [],
        next_review_at: null,
        review_mode_note: "Fredet kulturminne",
      }),
    ).toContain("Fredet kulturminne");
  });

  it("forklarer at policyen ikke gir review uten å vise en tom dato", () => {
    const tekst = forklarNesteReview({
      review_mode: "policy",
      review_interval_days: null,
      review_reasons: [],
      next_review_at: null,
    });
    expect(tekst).toMatch(/avvist|arkivert|historisk/i);
  });

  it("skriver dagene om til noe lesbart", () => {
    expect(nårReview(-12, "overdue")).toBe("12 dager forsinket");
    expect(nårReview(-1, "overdue")).toBe("1 dag forsinket");
    expect(nårReview(0, "due")).toBe("Review i dag");
    expect(nårReview(9, "due_soon")).toBe("Review om 9 dager");
    expect(nårReview(null, "no_review_needed")).toBe("Ingen review planlagt");
    expect(sistKontrollert(null)).toBe("Aldri kontrollert");
    expect(sistKontrollert(84)).toBe("Sist kontrollert for 84 dager siden");
  });

  it("setter grunnene på én linje og kutter med et antall", () => {
    const linje = grunnlinje(["planned_project", "high_interest", "medium_confidence", "missing_primary_source", "source_old"]);
    expect(linje.startsWith("Planlagt prosjekt")).toBe(true);
    expect(linje).toContain("+1");
    expect(grunnlinje([])).toBe("Ingen særskilt grunn");
  });

  it("har navn på alle tilstander og grunner", () => {
    for (const s of REVIEW_STATES) expect(REVIEW_STATE_LABEL[s]).toBeTruthy();
    for (const r of REVIEW_REASONS) expect(REVIEW_REASON_LABEL[r]).toBeTruthy();
    expect(DUE_SOON_DAGER).toBe(14);
  });
});
