import { describe, expect, it } from "vitest";
import { aggregate } from "../src/aggregate.js";
import type { Series } from "../src/types.js";

const ts = (iso: string) => Date.parse(iso) / 1000;

const series: Series = {
  symbol: "TEST",
  timezone: "America/New_York",
  bars: [
    { ts: ts("2024-06-03T13:30:00Z"), low: 10, high: 20, volume: 100 },
    { ts: ts("2024-06-03T14:30:00Z"), low: 12, high: 22, volume: 200 },
    { ts: ts("2024-06-03T16:30:00Z"), low: 14, high: 24, volume: 300 },
    { ts: ts("2024-06-04T13:30:00Z"), low: 20, high: 30, volume: 400 },
  ],
};

describe("aggregate", () => {
  it("groups by exchange-local day for 24h", () => {
    expect(aggregate(series, "24h")).toEqual([
      { time: "2024-06-03", lowAverage: 12, highAverage: 22, volume: 600 },
      { time: "2024-06-04", lowAverage: 20, highAverage: 30, volume: 400 },
    ]);
  });

  it("keeps hourly buckets for 1h", () => {
    const points = aggregate(series, "1h");
    expect(points.map((p) => p.time)).toEqual([
      "2024-06-03T09:00",
      "2024-06-03T10:00",
      "2024-06-03T12:00",
      "2024-06-04T09:00",
    ]);
  });
});
