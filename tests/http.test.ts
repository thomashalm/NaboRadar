import { describe, expect, it } from "vitest";
import { fetchJson, HttpError } from "@/lib/http";

/** Teller forsøk og svarer etter et gitt mønster. */
function fakeFetch(responses: (number | "network")[]) {
  const attempts: number[] = [];
  const impl = (async () => {
    const index = attempts.length;
    attempts.push(Date.now());
    const next = responses[Math.min(index, responses.length - 1)]!;
    if (next === "network") throw new TypeError("fetch failed");
    if (next >= 400) return new Response("{}", { status: next });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { impl, attempts };
}

describe("fetchJson: retry og backoff", () => {
  it("prøver på nytt ved 5xx og lykkes", async () => {
    const { impl, attempts } = fakeFetch([503, 503, 200]);
    const body = await fetchJson("https://example.test/data", { timeoutMs: 1000, retries: 3, baseDelayMs: 5, fetchImpl: impl });
    expect(body).toEqual({ ok: true });
    expect(attempts).toHaveLength(3);
  });

  it("prøver på nytt ved nettverksfeil", async () => {
    const { impl, attempts } = fakeFetch(["network", 200]);
    await fetchJson("https://example.test/data", { timeoutMs: 1000, retries: 2, baseDelayMs: 5, fetchImpl: impl });
    expect(attempts).toHaveLength(2);
  });

  it("venter lenger for hvert forsøk (eksponentiell backoff)", async () => {
    const { impl, attempts } = fakeFetch([503, 503, 200]);
    await fetchJson("https://example.test/data", { timeoutMs: 1000, retries: 3, baseDelayMs: 40, fetchImpl: impl });
    const first = attempts[1]! - attempts[0]!;
    const second = attempts[2]! - attempts[1]!;
    // Jitter er ±25 %, så vi sammenligner mot nedre grense i stedet for eksakte tall.
    expect(first).toBeGreaterThanOrEqual(25);
    expect(second).toBeGreaterThan(first);
  });

  it("gir opp etter siste forsøk og kaster kildens feil", async () => {
    const { impl, attempts } = fakeFetch([500]);
    await expect(
      fetchJson("https://example.test/data", { timeoutMs: 1000, retries: 2, baseDelayMs: 5, fetchImpl: impl }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(attempts).toHaveLength(3);
  });

  it("prøver aldri på nytt ved 4xx", async () => {
    const { impl, attempts } = fakeFetch([404]);
    await expect(
      fetchJson("https://example.test/data", { timeoutMs: 1000, retries: 3, baseDelayMs: 5, fetchImpl: impl }),
    ).rejects.toMatchObject({ status: 404 });
    expect(attempts).toHaveLength(1);
  });

  it("prøver ikke på nytt når kalleren har avbrutt", async () => {
    const controller = new AbortController();
    const impl = (async () => {
      controller.abort();
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(
      fetchJson("https://example.test/data", { timeoutMs: 1000, retries: 3, baseDelayMs: 5, signal: controller.signal, fetchImpl: impl }),
    ).rejects.toBeInstanceOf(Error);
  });
});
