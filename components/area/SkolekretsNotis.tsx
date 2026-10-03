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
import { DeepLinkTarget } from "./DeepLinkTarget";

/**
 * Liten notis under adressen: hvilket veiledende inntaksområde for barneskole adressen
 * ligger i.
 *
 * Bevisst en notis og ikke et kort. Dette er én opplysning, og den skal ikke konkurrere med
 * selve resultatsiden om oppmerksomheten. Utenfor Oslo, ved flertydig treff eller når kilden
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
      <DeepLinkTarget id="skolekrets" className="mt-5">
        <p className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">
          <span className="font-medium">{SKOLEKRETS_LABEL}</span>
          <span className="mt-0.5 block text-muted">
            {resultat.status === "utenfor" ? SKOLEKRETS_UTENFOR : SKOLEKRETS_UTILGJENGELIG}
          </span>
        </p>
      </DeepLinkTarget>
    );
  }

  const navn = resultat.skoler.map((s) => s.navn);
  // Uten kuratert kobling viser vi kretsnavnet. Vi gjetter aldri hvilken skole det er.
  const overskrift = navn.length > 0 ? navn.join(" og ") : resultat.krets;

  return (
    <DeepLinkTarget id="skolekrets" className="mt-5">
    <details className="rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-[15px] text-ink [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{SKOLEKRETS_LABEL}</span>
        <span aria-hidden="true" className="px-1.5 text-muted">
          ·
        </span>
        <span>{overskrift}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{SKOLEKRETS_UNDERTEKST}</span>
      </summary>

      <div className="border-t border-line px-4 py-3 text-[15px] leading-relaxed">
        <p className="text-ink">{describeSkolekrets(navn, resultat.krets)}</p>
        <p className="mt-2 text-muted">{SKOLEKRETS_FORBEHOLD}</p>
        <p className="mt-2 text-muted">{SKOLEKRETS_UNGDOMSTRINN}</p>
        <p className="mt-3 text-[13px] text-muted">
          Kilde:{" "}
          <a
            href={resultat.kildeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Oslo kommune
          </a>
        </p>
      </div>
    </details>
    </DeepLinkTarget>
  );
}
