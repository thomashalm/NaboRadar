import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readZipMember } from "@/lib/providers/zip-range";

/** Bygger et lite zip-arkiv i minnet: lokale hoder, innholdsfortegnelse og sluttpost. */
function zip(files: { name: string; text: string; store?: boolean }[]): Buffer {
  const deler: Buffer[] = [];
  const fortegnelse: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const navn = Buffer.from(file.name, "utf8");
    const rå = Buffer.from(file.text, "utf8");
    const data = file.store ? rå : deflateRawSync(rå);
    const lokal = Buffer.alloc(30);
    lokal.writeUInt32LE(0x04034b50, 0);
    lokal.writeUInt16LE(file.store ? 0 : 8, 8);
    lokal.writeUInt32LE(data.length, 18);
    lokal.writeUInt32LE(rå.length, 22);
    lokal.writeUInt16LE(navn.length, 26);
    // Ekstrafeltet i det lokale hodet er lengre enn i fortegnelsen — slik ekte arkiv ofte er.
    const ekstra = Buffer.alloc(4);
    lokal.writeUInt16LE(ekstra.length, 28);
    deler.push(lokal, navn, ekstra, data);

    const sentral = Buffer.alloc(46);
    sentral.writeUInt32LE(0x02014b50, 0);
    sentral.writeUInt16LE(file.store ? 0 : 8, 10);
    sentral.writeUInt32LE(data.length, 20);
    sentral.writeUInt32LE(rå.length, 24);
    sentral.writeUInt16LE(navn.length, 28);
    sentral.writeUInt32LE(offset, 42);
    fortegnelse.push(sentral, navn);
    offset += lokal.length + navn.length + ekstra.length + data.length;
  }
  const katalog = Buffer.concat(fortegnelse);
  const slutt = Buffer.alloc(22);
  slutt.writeUInt32LE(0x06054b50, 0);
  slutt.writeUInt16LE(files.length, 10);
  slutt.writeUInt32LE(katalog.length, 12);
  slutt.writeUInt32LE(offset, 16);
  return Buffer.concat([...deler, katalog, slutt]);
}

/** En tjener som bare svarer på HEAD og delforespørsler, og teller hvor mye den sender. */
function tjener(arkiv: Buffer, opts: { ignorerRange?: boolean } = {}) {
  const sendt: number[] = [];
  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "HEAD") return new Response(null, { status: 200, headers: { "content-length": String(arkiv.length) } });
    const range = /bytes=(\d+)-(\d+)/.exec(new Headers(init?.headers).get("range") ?? "");
    if (!range || opts.ignorerRange) return new Response(new Uint8Array(arkiv), { status: 200 });
    const del = arkiv.subarray(Number(range[1]), Number(range[2]) + 1);
    sendt.push(del.length);
    return new Response(new Uint8Array(del), { status: 206 });
  }) as typeof fetch;
  return { fetchImpl, sendt };
}

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
