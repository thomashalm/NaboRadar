import { Suspense } from "react";
import { getSkolekrets } from "@/lib/facts/skolekrets";
import {
  describeSkolekrets,
  SKOLEKRETS_FORBEHOLD,
  SKOLEKRETS_LABEL,
  SKOLEKRETS_UNDERTEKST,
  SKOLEKRETS_UNGDOMSTRINN,
  SKOLEKRETS_UTENFOR,
  SKOLEKRETS_UTILGJENGELIG,
} from "@/lib/facts/wording";
import { Chevron } from "@/components/ui/Chevron";
import { DeepLinkTarget } from "./DeepLinkTarget";
import { SectionShell } from "./SectionShell";

/**
 * Én rad i kapittelet «Hverdagen»: hvilket veiledende inntaksområde for barneskole adressen
 * ligger i.
 *
 * Bevisst én rad med detaljene bak en utvider. Dette er én opplysning, og den skal ikke
 * konkurrere med resten av resultatsiden om oppmerksomheten. Utenfor Oslo, ved flertydig treff eller når kilden
 * ikke svarer, vises ingenting i det hele tatt — vi later ikke som om fravær av data er et
 * svar.
 *
 * Teksten rendres på serveren, slik at den finnes i HTML-en. Det er forberedelsen til en
 * senere /skolekrets-side.
 *
 * Unntaket er når søket kom fra /skolekrets (`fraVerktoy`). Da har brukeren spurt om nettopp
 * dette, og å lande øverst uten forklaring ville vært et ubesvart spørsmål. Utenfor Oslo står
 * dekningsmeldingen her; svarer ikke kilden, står det — de to er ikke det samme.
 *
 * Notisen er ankeret `#skolekrets`.
 */
export function SkolekretsNotis({ lat, lng, fraVerktoy = false }: { lat: number; lng: number; fraVerktoy?: boolean }) {
  return (
    // Ingen plassholder mens den lastes: en notis som kanskje ikke finnes skal ikke
    // reservere plass og dytte siden nedover når svaret kommer.
    <Suspense fallback={null}>
      <SkolekretsInnhold lat={lat} lng={lng} fraVerktoy={fraVerktoy} />
    </Suspense>
  );
}

async function SkolekretsInnhold({ lat, lng, fraVerktoy }: { lat: number; lng: number; fraVerktoy: boolean }) {
  const resultat = await getSkolekrets(lat, lng);

  if (resultat.status === "flertydig" && process.env.NODE_ENV === "development") {
    console.warn(`[skolekrets] punktet dekkes av flere kretser: ${resultat.kretser.join(", ")}`);
  }
  if (resultat.status !== "ok") {
    if (!fraVerktoy) return null;
    return (
      <DeepLinkTarget id="skolekrets">
        <SectionShell label={SKOLEKRETS_LABEL}>
          <p className="type-support">
            {resultat.status === "utenfor" ? SKOLEKRETS_UTENFOR : SKOLEKRETS_UTILGJENGELIG}
          </p>
        </SectionShell>
      </DeepLinkTarget>
    );
  }

  const navn = resultat.skoler.map((s) => s.navn);
  // Uten kuratert kobling viser vi kretsnavnet. Vi gjetter aldri hvilken skole det er.
  const overskrift = navn.length > 0 ? navn.join(" og ") : resultat.krets;

  return (
    <DeepLinkTarget id="skolekrets">
      <SectionShell label={SKOLEKRETS_LABEL} hideLabel>
        <details className="disclosure">
          <summary className="-mx-2 flex items-start gap-3 rounded-control px-2 py-1.5 hover:bg-sunken">
            <span className="min-w-0 flex-1">
              <h3 className="type-h3 text-ink">{SKOLEKRETS_LABEL}</h3>
              <span className="type-support mt-0.5 block text-ink">{overskrift}</span>
              <span className="type-meta block">{SKOLEKRETS_UNDERTEKST}</span>
            </span>
            <Chevron className="mt-1.5" />
          </summary>

          <div className="pt-3 text-[15px] leading-relaxed">
            <p className="text-ink">{describeSkolekrets(navn, resultat.krets)}</p>
            <p className="type-support mt-2">{SKOLEKRETS_FORBEHOLD}</p>
            <p className="type-support mt-2">{SKOLEKRETS_UNGDOMSTRINN}</p>
            <p className="type-meta mt-3">
              Kilde:{" "}
              <a href={resultat.kildeUrl} target="_blank" rel="noopener noreferrer" className="link font-normal">
                Oslo kommune
              </a>
            </p>
          </div>
        </details>
      </SectionShell>
    </DeepLinkTarget>
  );
}
