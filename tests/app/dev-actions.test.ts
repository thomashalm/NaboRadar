import { afterEach, describe, expect, it, vi } from "vitest";
import { syncNowAction } from "@/app/dev/actions";

describe("syncNowAction (/dev «Sync now»)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("avviser kall i produksjon, selv om action-en kalles direkte", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const form = new FormData();
    form.set("mode", "full");
    expect(await syncNowAction({ status: "idle" }, form)).toEqual({
      status: "error",
      message: "Ikke tilgjengelig utenfor development.",
    });
  });

  it("avviser kall i test/andre miljøer", async () => {
    vi.stubEnv("NODE_ENV", "test");
    expect((await syncNowAction({ status: "idle" }, new FormData())).status).toBe("error");
  });
});
