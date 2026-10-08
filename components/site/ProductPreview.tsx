import { ThemeIcon } from "@/components/area/ThemeIcon";
import { THEME_COLORS } from "@/lib/area-themes";

/**
 * Forsidens produktbevis: en stilisert områdesjekk.
 *
 * Ren presentasjon. Kartet er tegnet for hånd, adressen finnes ikke, og linjene er eksempler på
 * hvordan funn formuleres — derfor står det «Eksempel» på den. Den viser hva man får: et kart med
 * søkepunkt og radius, og hovedfunnene ved siden av. Skjermlesere får én setning, ikke detaljene.
 */
const FUNN = [
  ["stoy", THEME_COLORS.stoy, "Støy", "Støy fra veitrafikk ved søkepunktet"],
  ["planer", THEME_COLORS.planer, "Planer", "2 varslede planoppstarter innen 1 km"],
  ["skole", THEME_COLORS.skole, "Skoler og barnehager", "3 skoler · 9 barnehager innen 1 km"],
  ["infrastruktur", THEME_COLORS.infrastruktur, "Infrastruktur", "1 transformatorstasjon innen 1 km"],
] as const;

export function ProductPreview() {
  return (
    <figure
      role="img"
      aria-label="Eksempel på en områdesjekk: et kart med søkepunkt, radius og funn i nærheten, og fire hovedfunn ved siden av."
      className="overflow-hidden rounded-panel border border-line-strong/70 bg-surface shadow-pop"
    >
      <div aria-hidden="true">
        <div className="relative">
          <ExampleMap />
          <span className="absolute top-3 left-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-medium text-muted shadow-float">
            Eksempel
          </span>
        </div>
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-medium text-subtle">Områdesjekk</p>
          <p className="text-lg leading-tight font-semibold tracking-[-0.02em] text-ink">Eksempelveien 12</p>
          <ul className="mt-2.5 divide-y divide-line border-t border-line">
            {FUNN.map(([id, color, label, text]) => (
              <li key={id} className="flex items-center gap-3 py-2">
                <ThemeIcon icon={id} color={color} />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-subtle">{label}</span>
                  <span className="block truncate text-sm font-medium text-ink">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}

/** Et kartutsnitt i samme uttrykk som det ekte kartet: grå grunn, radius i grønt, funn som prikker. */
function ExampleMap() {
  const gate = { stroke: "#ffffff", strokeLinecap: "round" as const, fill: "none" };
  return (
    <svg viewBox="0 0 480 250" className="block w-full bg-[#eceeea]" preserveAspectRatio="xMidYMid slice">
      {/* Park og vann */}
      <path d="M-10 150 Q70 120 130 160 T250 260 H-10Z" fill="#dfe8dc" />
      <path d="M390 -10 Q360 50 420 90 T500 120 V-10Z" fill="#d9e3ea" />
      {/* Gater */}
      <g {...gate} strokeWidth="7">
        <path d="M-10 70 H500" />
        <path d="M150 -10 V260" />
        <path d="M-10 200 L500 150" />
      </g>
      <g {...gate} strokeWidth="3.5">
        <path d="M60 -10 V150M240 -10 V260M320 -10 V260M400 90 V260" />
        <path d="M-10 25 H390M150 115 H500M150 160 H330M240 215 H500" />
      </g>
      {/* Kvartaler */}
      <g fill="#dcdfd9">
        <rect x="165" y="82" width="62" height="24" rx="2" />
        <rect x="255" y="82" width="52" height="24" rx="2" />
        <rect x="165" y="125" width="62" height="26" rx="2" />
        <rect x="335" y="125" width="52" height="20" rx="2" />
        <rect x="72" y="35" width="66" height="26" rx="2" />
        <rect x="255" y="170" width="52" height="30" rx="2" />
      </g>
      {/* Planområde */}
      <path d="M330 30 L385 28 L392 62 L338 66Z" fill="#2b5fb0" fillOpacity="0.16" stroke="#2b5fb0" strokeWidth="1.5" />
      {/* Radius og søkepunkt */}
      <circle cx="240" cy="122" r="104" fill="#1e5a4b" fillOpacity="0.06" stroke="#1e5a4b" strokeOpacity="0.75" strokeWidth="1.75" />
      {/* Funn */}
      <g stroke="#ffffff" strokeWidth="2">
        <circle cx="196" cy="60" r="5.5" fill="#0d7a6b" />
        <circle cx="300" cy="150" r="5.5" fill="#0d7a6b" />
        <circle cx="178" cy="176" r="5.5" fill="#0d7a6b" />
        <circle cx="290" cy="64" r="5.5" fill="#9b3a55" />
        <circle cx="318" cy="104" r="5.5" fill="#a8552f" />
        <circle cx="206" cy="150" r="5.5" fill="#8f7412" />
        <circle cx="360" cy="46" r="5.5" fill="#2b5fb0" />
      </g>
      <circle cx="240" cy="122" r="15" fill="#14171a" fillOpacity="0.14" />
      <circle cx="240" cy="122" r="7" fill="#14171a" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}
