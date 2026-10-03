/**
 * Avinors lufthavner: ICAO-kode → navn.
 *
 * Støysonedatasettet («Støysoner Avinors lufthavner») oppgir lufthavnen bare som ICAO-kode i
 * `stoykildenavn` («ENBO»). Navnene under er hentet fra Avinors eget støysonekart — tekstlaget
 * `LUFTHAVN` i tjenesten bak experience.arcgis.com/experience/ed39c47ac2df499f8926b69866c0eadc
 * (`Stoysoner_AVIGIS_v2/FeatureServer/0`) — 2026-10-03, ordrett.
 *
 * Bare koder vi har et navn for fra Avinor, står her. ENRY (Rygge) har støysoner i datasettet,
 * men ikke noe navn i Avinors tekstlag, og står derfor ikke — da viser kortet ingen lufthavn, og
 * aldri koden. Se docs/research/stormflo-flystoy-kildegjennomgang.md.
 *
 * Endres når Avinor legger til eller omdøper en lufthavn. Testet i tests/facts/flystoy.test.ts.
 */
export const AVINOR_LUFTHAVNER: Readonly<Record<string, string>> = {
  ENAL: "Ålesund lufthavn, Vigra",
  ENAN: "Andøya lufthavn, Andenes",
  ENAT: "Alta lufthavn",
  ENBL: "Førde lufthamn, Bringeland",
  ENBN: "Brønnøysund lufthavn, Brønnøy",
  ENBO: "Bodø lufthavn",
  ENBR: "Bergen lufthavn, Flesland",
  ENBS: "Båtsfjord lufthavn",
  ENBV: "Berlevåg lufthavn",
  ENCN: "Kristiansand lufthavn, Kjevik",
  ENDU: "Bardufoss lufthavn",
  ENEV: "Harstad/Narvik lufthavn, Evenes",
  ENFL: "Florø lufthamn",
  ENGM: "Oslo lufthavn, Gardermoen",
  ENHD: "Haugesund lufthavn, Karmøy",
  ENHF: "Hammerfest lufthavn",
  ENHK: "Hasvik lufthavn",
  ENHV: "Honningsvåg lufthavn, Valan",
  ENKB: "Kristiansund lufthavn, Kvernberget",
  ENKR: "Kirkenes lufthavn, Høybuktmoen",
  ENLK: "Leknes lufthavn",
  ENMH: "Mehamn lufthavn",
  ENML: "Molde lufthavn, Årø",
  ENMS: "Mosjøen lufthavn, Kjærstad",
  ENNA: "Lakselv lufthavn, Banak",
  ENNM: "Namsos lufthavn",
  ENOV: "Ørsta/Volda lufthamn, Hovden",
  ENRA: "Mo i Rana lufthavn, Røssvoll",
  ENRM: "Rørvik lufthavn, Ryum",
  ENRO: "Røros lufthavn",
  ENRS: "Røst lufthavn",
  ENSB: "Svalbard lufthavn, Longyear",
  ENSD: "Sandane lufthamn, Anda",
  ENSG: "Sogndal lufthamn, Haukåsen",
  ENSH: "Svolvær lufthavn, Helle",
  ENSK: "Stokmarknes lufthavn, Skagen",
  ENSR: "Sørkjosen lufthavn",
  ENSS: "Vardø lufthavn, Svartnes",
  ENST: "Sandnessjøen lufthavn, Stokka",
  ENTC: "Tromsø lufthavn, Langnes",
  ENVA: "Trondheim lufthavn, Værnes",
  ENVD: "Vadsø lufthavn",
  ENVR: "Værøy helikopterhavn",
  ENZV: "Stavanger lufthavn, Sola",
};

/** Navnet på lufthavnen, eller null når vi ikke har et navn fra Avinor. Aldri ICAO-koden. */
export function lufthavnNavn(icao: string | null | undefined): string | null {
  if (!icao) return null;
  return AVINOR_LUFTHAVNER[icao.trim().toUpperCase()] ?? null;
}
