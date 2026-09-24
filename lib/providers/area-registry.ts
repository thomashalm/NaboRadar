import { MdirForurensetGrunnProvider } from "./mdir/forurenset-grunn";
import { MdirIndustriProvider } from "./mdir/industri";
import { NveKvikkleireSonerProvider } from "./nve/kvikkleire-soner";
import { NveNettanleggProvider } from "./nve/nettanlegg";
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
];

export function getAreaFeatureProvider(id: string): AreaFeatureProvider | undefined {
  return areaFeatureProviders.find((p) => p.id === id);
}
