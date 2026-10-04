/**
 * Svaret på «ligger punktet i NVEs aktsomhetsområde for kvikkleireskred?», og teksten til det.
 *
 * Egen fil uten avhengigheter, slik at klientkomponenten kan bruke teksten uten å dra med seg
 * oppslaget mot NVE (lib/admin/explore/kvikkleire.ts).
 */
export type Aktsomhet = "innenfor" | "utenfor" | "ikke_kartlagt";


export const AKTSOMHET_TEKST: Record<Aktsomhet, { tittel: string; tekst: string }> = {
  innenfor: {
    tittel: "Aktsomhetsområde for kvikkleireskred",
    tekst:
      "Punktet ligger i NVEs aktsomhetsområde. Det er et oversiktskart som sier at forholdene bør undersøkes nærmere — ikke at kvikkleire er påvist, og ikke en kartlagt kvikkleiresone.",
  },
  utenfor: {
    tittel: "Ikke i aktsomhetsområde",
    tekst: "Punktet ligger i et område aktsomhetskartet dekker, men utenfor aktsomhetsområdene.",
  },
  ikke_kartlagt: {
    tittel: "Aktsomhetskartet dekker ikke punktet",
    tekst: "NVEs aktsomhetskart for kvikkleireskred har ingen dekning her. Det sier ingenting om grunnen.",
  },
};
