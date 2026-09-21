export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
  }
}

export interface FetchJsonOptions {
  timeoutMs: number;
  /** Antall nye forsøk etter første. Kun ved nettverksfeil, timeout og 5xx. */
  retries?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) return error.status >= 500;
  // Nettverksfeil (TypeError) og timeout (TimeoutError). Ikke når kallet ble avbrutt av kaller.
  return error instanceof Error && error.name !== "AbortError";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET som returnerer parsed JSON (unknown — valideres av kaller med Zod).
 * Timeout per forsøk, eksponentiell backoff med jitter, aldri retry på 4xx.
 */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const { timeoutMs, retries = 0, baseDelayMs = 200, signal, fetchImpl = fetch } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        cache: "no-store",
      });
      if (!response.ok) throw new HttpError(response.status, url);
      return await response.json();
    } catch (error) {
      if (signal?.aborted || attempt >= retries || !isRetryable(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt * (0.75 + Math.random() * 0.5));
    }
  }
}
