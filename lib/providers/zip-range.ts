import { inflateRawSync } from "node:zlib";
import { HttpError } from "@/lib/http";
import type { HttpRetryPolicy } from "@/lib/sync/types";

/**
 * Leser én fil ut av et zip-arkiv på nettet uten å laste ned hele arkivet.
 *
 * Kartverkets N50 leveres som ett arkiv per kommune med alle temaene i. Vi trenger ett av dem.
 * Et zip-arkiv har innholdsfortegnelsen sist, så tre delforespørsler holder: slutten av filen,
 * fortegnelsen, og den ene filen vi vil ha.
 *
 * Støtter det Kartverket faktisk leverer: deflate eller ulagret, uten ZIP64 og uten kryptering.
 * Alt annet gir en feil framfor et gjettet svar.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
/** Sluttposten er 22 byte pluss en kommentar på inntil 65 535 byte. */
const EOCD_SEARCH_BYTES = 22 + 65_535;

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export interface ZipRangeOptions {
  retry: HttpRetryPolicy;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

async function fetchRange(url: string, from: number, to: number, options: ZipRangeOptions): Promise<Buffer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  for (let attempt = 0; ; attempt++) {
    try {
      const timeout = AbortSignal.timeout(options.retry.timeoutMs);
      const response = await fetchImpl(url, {
        headers: { Range: `bytes=${from}-${to}` },
        signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
        cache: "no-store",
      });
      // 200 betyr at tjeneren overså Range og sender hele filen. Det skal vi ikke ta imot stille.
      if (response.status !== 206) throw new HttpError(response.status, url);
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length !== to - from + 1) throw new Error(`Forventet ${to - from + 1} byte, fikk ${body.length}`);
      return body;
    } catch (error) {
      const retryable = !(error instanceof HttpError && error.status < 500) && !options.signal?.aborted;
      if (!retryable || attempt >= options.retry.maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, options.retry.baseDelayMs * 2 ** attempt));
    }
  }
}

async function contentLength(url: string, options: ZipRangeOptions): Promise<number> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, { method: "HEAD", signal: options.signal, cache: "no-store" });
  if (!response.ok) throw new HttpError(response.status, url);
  const length = Number(response.headers.get("content-length"));
  if (!Number.isFinite(length) || length < 22) throw new Error("Tjeneren oppga ingen gyldig filstørrelse");
  return length;
}

/** Innholdsfortegnelsen i et arkiv. Ren funksjon over bytene, slik at den kan testes uten nett. */
export function parseCentralDirectory(directory: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  for (let offset = 0; offset + 46 <= directory.length; ) {
    if (directory.readUInt32LE(offset) !== CENTRAL_SIGNATURE) break;
    const nameLength = directory.readUInt16LE(offset + 28);
    const extraLength = directory.readUInt16LE(offset + 30);
    const commentLength = directory.readUInt16LE(offset + 32);
    entries.push({
      method: directory.readUInt16LE(offset + 10),
      compressedSize: directory.readUInt32LE(offset + 20),
      uncompressedSize: directory.readUInt32LE(offset + 24),
      localHeaderOffset: directory.readUInt32LE(offset + 42),
      name: directory.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Hvor innholdsfortegnelsen ligger, lest fra slutten av arkivet. */
export function locateCentralDirectory(tail: Buffer): { offset: number; size: number } {
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail.readUInt32LE(i) !== EOCD_SIGNATURE) continue;
    const size = tail.readUInt32LE(i + 12);
    const offset = tail.readUInt32LE(i + 16);
    if (size === 0xffffffff || offset === 0xffffffff) throw new Error("ZIP64-arkiv støttes ikke");
    return { offset, size };
  }
  throw new Error("Fant ikke slutten av zip-arkivet");
}

/**
 * Henter den første filen i arkivet som passer `match`, som tekst. Null hvis ingen passer.
 */
export async function readZipMember(
  url: string,
  match: (name: string) => boolean,
  options: ZipRangeOptions,
): Promise<{ name: string; text: string } | null> {
  const size = await contentLength(url, options);
  const tailStart = Math.max(0, size - EOCD_SEARCH_BYTES);
  const tail = await fetchRange(url, tailStart, size - 1, options);
  const directoryAt = locateCentralDirectory(tail);

  const directory =
    directoryAt.offset >= tailStart
      ? tail.subarray(directoryAt.offset - tailStart, directoryAt.offset - tailStart + directoryAt.size)
      : await fetchRange(url, directoryAt.offset, directoryAt.offset + directoryAt.size - 1, options);

  const entry = parseCentralDirectory(directory).find((e) => match(e.name));
  if (!entry) return null;
  if (entry.method !== 0 && entry.method !== 8) throw new Error(`Ukjent komprimering (${entry.method}) i ${entry.name}`);
  if (entry.compressedSize === 0xffffffff) throw new Error("ZIP64-arkiv støttes ikke");

  // Lokalt hode: 30 byte, så navn og ekstrafelt med lengder som kan avvike fra fortegnelsen.
  const header = await fetchRange(url, entry.localHeaderOffset, entry.localHeaderOffset + 29, options);
  if (header.readUInt32LE(0) !== LOCAL_SIGNATURE) throw new Error(`Ugyldig lokalt hode for ${entry.name}`);
  const dataStart = entry.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  const data =
    entry.compressedSize === 0
      ? Buffer.alloc(0)
      : await fetchRange(url, dataStart, dataStart + entry.compressedSize - 1, options);

  const raw = entry.method === 8 ? inflateRawSync(data) : data;
  if (raw.length !== entry.uncompressedSize) throw new Error(`Størrelsen på ${entry.name} stemmer ikke`);
  return { name: entry.name, text: raw.toString("utf8") };
}
