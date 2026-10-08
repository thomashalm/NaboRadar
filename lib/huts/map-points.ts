/**
 * En hytte eller koie som kartpunkt på resultatsiden, ferdig formulert på serveren.
 * Klienten trenger bare å tegne den og vise popupen.
 */
export interface FriluftPoint {
  id: string;
  name: string;
  center: [number, number];
  /** Linjene i popupen: type, forvalter og avstand. */
  lines: string[];
  /** Hyttas egen side. */
  href: string;
}
