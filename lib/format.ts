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
