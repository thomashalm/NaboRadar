import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupProperty } from "@/lib/property/lookup";

/**
 * Eiendomsoppslag for kartklikk. Kalles kun på eksplisitt klikk, aldri ved panorering.
 *
 * Oppslaget gjøres på serveren: da holder vi timeout og mellomlagring ett sted, og
 * klienten slipper å kjenne til Geonorge.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  lat: z.coerce.number().min(57).max(72),
  lng: z.coerce.number().min(4).max(32),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = paramsSchema.safeParse({ lat: url.searchParams.get("lat"), lng: url.searchParams.get("lng") });
  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: "Ugyldig posisjon." }, { status: 400 });
  }

  const started = performance.now();
  const result = await lookupProperty(parsed.data.lat, parsed.data.lng);
  const ms = Math.round(performance.now() - started);

  // Kort caching i nettleseren: samme klikk to ganger skal ikke koste et nytt kall.
  return NextResponse.json(result, {
    headers: { "cache-control": "private, max-age=60", "server-timing": `lookup;dur=${ms}` },
  });
}
