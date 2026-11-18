import { describe, expect, it } from "vitest";
import { parseParams } from "../src/params.js";
import { windowKey } from "../src/types.js";

const now = new Date("2026-11-18T12:00:00Z");
const parse = (q: Record<string, unknown>) => parseParams("aapl", q, now);

describe("parseParams", () => {
  it("defaults to the 5d preset", () => {
    expect(parse({})).toMatchObject({ ok: true, window: { kind: "preset", range: "5d" } });
  });

  it("accepts a custom window", () => {
    expect(parse({ from: "2026-11-02", to: "2026-11-06" })).toMatchObject({
      ok: true,
      window: { kind: "custom", from: "2026-11-02", to: "2026-11-06" },
    });
  });

  it.each([
    ["from only", { from: "2026-11-02" }],
    ["to only", { to: "2026-11-02" }],
    ["range with from/to", { range: "1d", from: "2026-11-02", to: "2026-11-03" }],
    ["bad format", { from: "11/02/2026", to: "2026-11-03" }],
    ["impossible date", { from: "2026-02-30", to: "2026-03-03" }],
    ["from after to", { from: "2026-11-05", to: "2026-11-02" }],
    ["too far back", { from: "2024-01-01", to: "2024-01-05" }],
    ["future from", { from: "2026-12-01", to: "2026-12-05" }],
    ["repeated param", { from: ["2026-11-02", "2026-11-03"], to: "2026-11-05" }],
  ])("rejects %s", (_, q) => {
    expect(parse(q)).toMatchObject({ ok: false });
  });

  it("defaults interval by window length", () => {
    expect(parse({ range: "1d" })).toMatchObject({ ok: true, interval: "1h" });
    expect(parse({ range: "1mo" })).toMatchObject({ ok: true, interval: "24h" });
    expect(parse({ from: "2026-11-02", to: "2026-11-09" })).toMatchObject({
      ok: true,
      interval: "24h",
    });
  });

  it("allows 1h up to 5 days", () => {
    expect(parse({ range: "5d", interval: "1h" })).toMatchObject({ ok: true });
    expect(parse({ from: "2026-11-02", to: "2026-11-06", interval: "1h" })).toMatchObject({
      ok: true,
    });
  });

  it("rejects 1h beyond 5 days", () => {
    expect(parse({ range: "1mo", interval: "1h" })).toMatchObject({ ok: false });
    expect(parse({ from: "2026-11-02", to: "2026-11-07", interval: "1h" })).toMatchObject({
      ok: false,
    });
  });

  it("allows 24h for any window", () => {
    expect(parse({ range: "1mo", interval: "24h" })).toMatchObject({ ok: true });
    expect(parse({ from: "2026-01-02", to: "2026-11-07", interval: "24h" })).toMatchObject({
      ok: true,
    });
  });

  it("builds distinct cache keys per window", () => {
    expect(windowKey("AAPL", { kind: "preset", range: "5d" })).toBe("AAPL|5d");
    expect(windowKey("AAPL", { kind: "custom", from: "2026-11-02", to: "2026-11-06" })).toBe(
      "AAPL|2026-11-02|2026-11-06",
    );
  });
});
