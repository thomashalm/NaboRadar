import { DsbTilfluktsromProvider } from "./dsb/tilfluktsrom";
import { GbifKantarellfunnProvider, GbifMultefunnProvider, GbifTyttebaerfunnProvider } from "./gbif/multefunn";
import { SykehusProvider } from "./helse/sykehus";
import { KartverketN50HytterProvider } from "./kartverket/n50-hytter";
import { KartverketN50MyrProvider } from "./kartverket/n50-myr";
import { KartverketTurrutebasenHytterProvider } from "./kartverket/turrutebasen-hytter";
import { MdirForurensetGrunnProvider } from "./mdir/forurenset-grunn";
import { MdirIndustriProvider } from "./mdir/industri";
import { NveKvikkleireSonerProvider } from "./nve/kvikkleire-soner";
import { NveNettanleggProvider } from "./nve/nettanlegg";
import { OmsorgstilbudProvider } from "./omsorg/omsorgstilbud";
import { OsloSkjenkebevillingProvider } from "./oslo/skjenkebevilling";
import { OsloSkolekretsProvider } from "./oslo/skolekrets";
import { UdirBarnehagerProvider } from "./udir/barnehager";
import { UdirSkolerProvider } from "./udir/skoler";
import type { AreaFeatureProvider } from "./types";

/**
 * Providere som synkes til area_features. Kilder som er for store til synk
 * (kvikkleire-aktsomhet, strategisk støy, T-1442, distribusjonsnett) ligger i lib/facts/lookups.
 */
export const areaFeatureProviders: readonly AreaFeatureProvider[] = [
  new MdirForurensetGrunnProvider(),
  new MdirIndustriProvider(),
  new NveKvikkleireSonerProvider(),
  new NveNettanleggProvider(),
  new UdirSkolerProvider(),
  new UdirBarnehagerProvider(),
  new SykehusProvider(),
  new OsloSkjenkebevillingProvider(),
  new OmsorgstilbudProvider(),
  new OsloSkolekretsProvider(),
  new DsbTilfluktsromProvider(),
  // Hyttekildene skriver kildeposter (kategori hytte_kilde), og kaller refresh_huts() etterpå.
  // Hovedkilden først, slik at den oppretter hyttene og sekundærkilden kobler seg på.
  new KartverketN50HytterProvider(),
  new KartverketTurrutebasenHytterProvider(),
  // Internt researchlag i admin (Utforsk data): multefunn, tyttebærfunn, kantarellfunn og myr i Oslo og Marka. Upublisert
  // kategori, og uten tidsplan i providers-tabellen — synkes for hånd.
  new GbifMultefunnProvider(),
  new GbifTyttebaerfunnProvider(),
  new GbifKantarellfunnProvider(),
  new KartverketN50MyrProvider(),
];

export function getAreaFeatureProvider(id: string): AreaFeatureProvider | undefined {
  return areaFeatureProviders.find((p) => p.id === id);
}
