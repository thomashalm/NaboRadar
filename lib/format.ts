const LOWERCASE_WORDS = new Set(["i", "og", "på"]);

/**
 * Kartverket returnerer kommune- og poststedsnavn i STORE BOKSTAVER («OSLO», «AURSKOG-HØLAND»).
 * Konverterer til vanlig skrivemåte for visning. Navn som allerede har blandet case beholdes.
 */
export function toDisplayName(value: string): string {
  const trimmed = value.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("-"),
    )
    .join(" ");
}

export function formatRadius(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : km.toLocaleString("nb-NO")} km`;
  }
  return `${meters} m`;
}

const nbNumber = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

/** «Omfatter stedet» når punktet ligger inni, ellers «430 m unna» / «2,2 km unna». */
export function formatDistance(meters: number): string {
  if (meters < 1) return "Omfatter valgt sted";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m unna`;
  return `${nbNumber.format(Math.round(meters / 100) / 10)} km unna`;
}

/** Beregnet areal, avrundet så det ikke gir inntrykk av falsk presisjon. «12 400 m²». */
export function formatArea(squareMeters: number): string {
  const step = squareMeters < 1000 ? 10 : squareMeters < 100_000 ? 100 : 1000;
  const rounded = Math.round(squareMeters / step) * step;
  return `${new Intl.NumberFormat("nb-NO").format(rounded)} m²`;
}

const dateFormat = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** «2026-03-14» eller ISO-tidsstempel → «14. mars 2026». */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}
