import "server-only";
import { SOURCES } from "@/lib/facts/wording";
import { hentAreaFeatures, rader, tall, tekst, type AreaFeatureRad } from "./area-features";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Kraftnett i Utforsk data: NVEs nettanlegg — kraftledninger og transformatorstasjoner.
 *
 * 4 115 ledninger og 1 541 stasjoner, lest fra `area_features`. Kilden har spenning, nettnivå,
 * eier og driftsår; navn har stasjonene, mens ledningene heter «Kraftledning». Jordkabler og
 * distribusjonsnettet under regionalnettet er ikke med i dette datasettet.
 */
const PROVIDER = "nve-nettanlegg";

const NETTNIVAA: Record<string, string> = { sentral: "transmisjonsnett", transmisjon: "transmisjonsnett", regional: "regionalnett", distribusjon: "distribusjonsnett" };

export const kraftnettDataset: ExploreDataset = {
  id: "kraftnett",
  label: "Kraftnett",
  unit: { one: "anlegg", many: "anlegg" },
  aliases: ["kraftnett", "kraftlinje", "kraftlinjer", "kraftledning", "kraftledninger", "høyspent", "høyspentlinje", "høyspentlinjer", "transformatorstasjon", "transformatorstasjoner", "trafostasjon", "trafostasjoner", "nettanlegg"],
  needsArea: true,
  policy: { openMap: "vurderes", omrade: "ja" },
  description: "Kraftledninger og transformatorstasjoner fra NVE. Jordkabler og det lokale distribusjonsnettet er ikke med.",

  async load(client, area) {
    if (!area) return { features: [], total: 0, error: null };
    const svar = await hentAreaFeatures(client, PROVIDER, area);
    if (svar.error) return { features: [], total: 0, error: svar.error };
    return { features: svar.rader.map((rad) => kraftnettFeature(rad, area.kind === "kommune" ? area.name : null)), total: svar.total, error: null };
  },
};

/** Eksportert for test. */
export function kraftnettFeature(rad: AreaFeatureRad, kommune: string | null): Omit<ExploreFeature, "datasetId" | "datasetLabel"> {
  const a = rad.attributes;
  const stasjon = rad.subtype === "transformatorstasjon";
  const spenning = tall(a.spenningKv);
  const nivaa = NETTNIVAA[tekst(a.nettnivaa) ?? ""] ?? null;
  const eier = tekst(a.eier);
  const aar = tall(a.driftsattAar);
  // Ledningene har ikke egennavn i kilden. Da er spenningen det som skiller dem.
  const egennavn = tekst(rad.title) && rad.title !== "Kraftledning" ? rad.title : null;
  const type = stasjon ? "Transformatorstasjon" : "Kraftledning";

  return {
    id: rad.id,
    title: egennavn ?? (spenning !== null ? `${type} ${spenning} kV` : type),
    kind: type,
    style: stasjon ? "transformatorstasjon" : "kraftledning",
    geometry: rad.geometry,
    center: rad.center.coordinates as [number, number],
    place: kommune,
    summary: [spenning !== null ? `${spenning} kV` : null, nivaa, eier].filter(Boolean).join(" · ") || null,
    details: rader([
      { label: "Type", value: type },
      egennavn ? { label: "Navn", value: egennavn } : null,
      spenning !== null ? { label: "Spenning", value: `${spenning} kV` } : null,
      nivaa ? { label: "Nettnivå", value: nivaa } : null,
      eier ? { label: "Eier", value: eier } : null,
      aar ? { label: "Satt i drift", value: String(aar) } : null,
      kommune ? { label: "Kommune", value: kommune } : null,
    ]),
    explanation: stasjon ? null : "Linjen er luftledningen slik NVE har den. Spenning er driftsspenningen kilden oppgir.",
    notice: null,
    sourceName: `${SOURCES[PROVIDER]?.name ?? "Nettanlegg"} (NVE)`,
    sourceUrl: rad.source_url,
    href: null,
    hrefLabel: null,
  };
}
