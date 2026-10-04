import { ANLEGGSTYPE_LABEL, mwTekst } from "@/lib/admin/datacenter-types";
import { lesFilter } from "@/lib/admin/research-map-filters";
import { hentKartpunkter, type Kartpunkt } from "@/lib/admin/research-map-query";
import { LEVEL_LABEL, OPERATIONAL_LABEL, VERIFICATION_LABEL } from "@/lib/admin/research-types";
import { punktIFlate } from "./area";
import type { ExploreDataset, ExploreFeature } from "./types";

/**
 * Datasentre i Utforsk data.
 *
 * Datasentrene er ikke et eget register: de er research-funn med underkategorien «Datasenter»,
 * med egne felt i `admin_research_datacenter_details`. Dette datasettet leser dem gjennom
 * samme vei som research-kartet (`research_map`, som krever admin i databasen), og oppretter
 * ingen kopi.
 *
 * Bare funn med koordinat og med standard verifisering vises — avviste og arkiverte er ikke
 * med. Alt her er interne research-funn, og panelet sier det. Kilder og notater står på
 * funnets egen side.
 */
export const datasenterDataset: ExploreDataset = {
  id: "datasenter",
  label: "Datasenter",
  unit: { one: "datasenter", many: "datasentre" },
  aliases: ["datasenter", "datasentre", "datasenteret", "datasentrene", "data center", "data centers", "datacenter", "datasentere"],
  needsArea: false,
  description: "Registrerte datasentre fra intern research. Ikke et offentlig register.",

  async load(client, area) {
    const resultat = await hentKartpunkter(client, { ...lesFilter({ kategori: "datasenter" }), kunMedPunkt: true });
    if (resultat.feil) return { features: [], total: 0, error: resultat.feil };

    const punkter = resultat.punkter.filter((p) => {
      if (p.latitude === null || p.longitude === null) return false;
      if (!area) return true;
      if (area.polygon) return punktIFlate(p.longitude, p.latitude, area.polygon);
      const { minLng, minLat, maxLng, maxLat } = area.box;
      return p.longitude >= minLng && p.longitude <= maxLng && p.latitude >= minLat && p.latitude <= maxLat;
    });
    return { features: punkter.map(datasenterFeature), total: punkter.length, error: null };
  },
};

/** Eksportert for test. */
export function datasenterFeature(p: Kartpunkt): ExploreFeature {
  const dc = p.datasenter ?? null;
  const kapasitet = mwTekst(dc?.mw ?? null);
  const sted = [p.address, p.city].filter(Boolean).join(", ");

  const details = [
    { label: "Type", value: dc?.facility_type ? (ANLEGGSTYPE_LABEL[dc.facility_type] ?? "Datasenter") : "Datasenter" },
    sted ? { label: "Adresse", value: sted } : null,
    p.municipality ? { label: "Kommune", value: p.municipality } : null,
    { label: "Driftsstatus", value: OPERATIONAL_LABEL[p.operational_status] },
    { label: "Verifisering", value: VERIFICATION_LABEL[p.verification_status] },
    { label: "Sikkerhet", value: LEVEL_LABEL[p.confidence] },
    dc?.operators ? { label: "Operatør", value: dc.operators } : null,
    dc?.owners ? { label: "Eier", value: dc.owners } : null,
    kapasitet ? { label: "Kapasitet", value: kapasitet } : null,
    { label: "Kilder", value: `${p.source_count} ${p.source_count === 1 ? "kilde" : "kilder"}` },
    { label: "Sist endret", value: new Date(p.updated_at).toLocaleDateString("nb-NO", { dateStyle: "medium" }) },
  ].filter((rad): rad is { label: string; value: string } => rad !== null);

  return {
    id: p.id,
    title: p.title,
    kind: "Datasenter",
    style: "datasenter",
    geometry: { type: "Point", coordinates: [p.longitude!, p.latitude!] },
    center: [p.longitude!, p.latitude!],
    place: p.municipality ?? p.city,
    summary: [OPERATIONAL_LABEL[p.operational_status], VERIFICATION_LABEL[p.verification_status]].join(" · "),
    details,
    explanation: null,
    notice: "Internt research-funn. Ikke publisert, og ikke et offentlig register.",
    sourceName: "NaboRadar research",
    sourceUrl: null,
    href: `/admin/research/${p.id}`,
    hrefLabel: "Åpne funnet med kilder og notater",
  };
}
