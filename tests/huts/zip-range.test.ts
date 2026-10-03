import { describe, expect, it } from "vitest";
import { readZipMember } from "@/lib/providers/zip-range";
import { zip, zipTjener as tjener } from "../helpers/fake-zip";

const retry = { timeoutMs: 5_000, maxRetries: 0, baseDelayMs: 1 };

describe("lesing av én fil fra et zip-arkiv på nettet", () => {
  const stor = "x".repeat(200_000);
  const arkiv = zip([
    { name: "Basisdata_0301_Oslo_25833_N50Arealdekke_GML.gml", text: stor },
    { name: "Basisdata_0301_Oslo_25833_N50BygningerOgAnlegg_GML.gml", text: "<gml>hytter æøå</gml>" },
    { name: "lesmeg.txt", text: "ukomprimert", store: true },
  ]);

  it("henter riktig fil, komprimert eller ikke", async () => {
    const { fetchImpl } = tjener(arkiv);
    const fil = await readZipMember("https://eksempel.test/a.zip", (navn) => /BygningerOgAnlegg/.test(navn), { retry, fetchImpl });
    expect(fil).toEqual({ name: "Basisdata_0301_Oslo_25833_N50BygningerOgAnlegg_GML.gml", text: "<gml>hytter æøå</gml>" });

    const lagret = await readZipMember("https://eksempel.test/a.zip", (navn) => navn === "lesmeg.txt", { retry, fetchImpl });
    expect(lagret!.text).toBe("ukomprimert");
  });

  it("gir null når ingen fil passer", async () => {
    const { fetchImpl } = tjener(arkiv);
    expect(await readZipMember("https://eksempel.test/a.zip", () => false, { retry, fetchImpl })).toBeNull();
  });

  it("nekter å ta imot hele filen når tjeneren overser Range", async () => {
    const { fetchImpl } = tjener(arkiv, { ignorerRange: true });
    await expect(readZipMember("https://eksempel.test/a.zip", () => true, { retry, fetchImpl })).rejects.toThrow();
  });

  it("avviser noe som ikke er et zip-arkiv", async () => {
    const { fetchImpl } = tjener(Buffer.from("dette er ikke et arkiv, bare tekst som er lang nok"));
    await expect(readZipMember("https://eksempel.test/a.zip", () => true, { retry, fetchImpl })).rejects.toThrow(/slutten av zip-arkivet/);
  });
});
