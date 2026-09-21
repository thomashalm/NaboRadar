import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { geocoder, MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/lib/geocoding";
import { GeocodingUnavailableError, type SearchLocation } from "@/lib/geocoding/types";

export type GeocodeResponse =
  | { results: SearchLocation[]; partial: boolean }
  | { error: "invalid_query" | "unavailable" };

const querySchema = z.object({
  q: z.string().trim().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json<GeocodeResponse>({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const { results, sources } = await geocoder.searchDetailed(parsed.data.q, {
      signal: request.signal,
    });
    const partial = sources.address === "error" || sources.place === "error";
    return NextResponse.json<GeocodeResponse>(
      { results, partial },
      // Kun nettleserens egen cache; delvise svar caches ikke.
      { headers: { "Cache-Control": partial ? "no-store" : "private, max-age=300" } },
    );
  } catch (error) {
    if (!(error instanceof GeocodingUnavailableError)) {
      console.error("[geocode] uventet feil", error instanceof Error ? error.name : "ukjent");
    }
    return NextResponse.json<GeocodeResponse>(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
