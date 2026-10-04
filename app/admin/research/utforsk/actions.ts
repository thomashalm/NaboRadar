"use server";

import { getAdminSession } from "@/lib/admin/session";
import type { Aktsomhet } from "@/lib/admin/explore/aktsomhet";
import { aktsomhetVedPunkt } from "@/lib/admin/explore/kvikkleire";
import { isWithinNorway } from "@/lib/area-params";

export type AktsomhetSvar = { status: "ok"; aktsomhet: Aktsomhet } | { status: "feil"; melding: string };

/**
 * Aktsomhetsområde for kvikkleireskred ved ett punkt, for Utforsk data.
 *
 * Bare for admin: handlingen sjekker sesjonen selv, uavhengig av at siden gjør det. En feil hos
 * NVE gir «feil», aldri «utenfor».
 */
export async function sjekkAktsomhetAction(lat: number, lng: number): Promise<AktsomhetSvar> {
  const session = await getAdminSession();
  if (session.state !== "admin") return { status: "feil", melding: "Krever innlogging som admin." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isWithinNorway(lat, lng)) {
    return { status: "feil", melding: "Punktet ligger utenfor Norge." };
  }
  try {
    return { status: "ok", aktsomhet: await aktsomhetVedPunkt(lat, lng) };
  } catch {
    return { status: "feil", melding: "NVEs aktsomhetskart svarte ikke akkurat nå." };
  }
}
