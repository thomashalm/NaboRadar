import { deflateRawSync } from "node:zlib";

/**
 * Et zip-arkiv i minnet og en tjener som svarer på HEAD og delforespørsler — det
 * lib/providers/zip-range.ts trenger for å lese én fil ut av et arkiv på nettet.
 */

/** Bygger et lite zip-arkiv i minnet: lokale hoder, innholdsfortegnelse og sluttpost. */
export function zip(files: { name: string; text: string; store?: boolean }[]): Buffer {
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
export function zipTjener(arkiv: Buffer, opts: { ignorerRange?: boolean } = {}) {
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
