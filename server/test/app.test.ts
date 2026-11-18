import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createCachedFetcher } from "../src/cache.js";
import { TickerNotFoundError, UpstreamError } from "../src/errors.js";
import type { Series } from "../src/types.js";

const series: Series = {
  symbol: "AAPL",
  timezone: "America/New_York",
  bars: [{ ts: Date.parse("2024-06-03T14:30:00Z") / 1000, low: 1, high: 3, volume: 10 }],
};

const upstream = vi.fn(async (ticker: string) => {
  if (ticker === "NOPE") throw new TickerNotFoundError(ticker);
  if (ticker === "LIMIT") throw new UpstreamError("rate", 429);
  if (ticker === "BOOM") throw new UpstreamError("bad", 502);
  return series;
});

let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
let base: string;

beforeAll(async () => {
  server = createApp(createCachedFetcher(upstream)).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe("GET /api/stocks/:ticker", () => {
  it("returns aggregated points", async () => {
    const res = await fetch(`${base}/api/stocks/aapl?range=1d&interval=24h`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticker).toBe("AAPL");
    expect(body.points).toEqual([
      { time: "2024-06-03", lowAverage: 1, highAverage: 3, volume: 10 },
    ]);
  });

  it("serves different intervals from one cached upstream call", async () => {
    upstream.mockClear();
    await fetch(`${base}/api/stocks/MSFT?range=5d&interval=1h`);
    await fetch(`${base}/api/stocks/MSFT?range=5d&interval=24h`);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("accepts custom from/to and echoes them", async () => {
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const res = await fetch(`${base}/api/stocks/AAPL?from=${recent}&to=${recent}&interval=24h`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ from: recent, to: recent });
    expect(body.range).toBeUndefined();
  });

  it("returns 400 for range combined with from/to", async () => {
    const res = await fetch(`${base}/api/stocks/AAPL?range=1d&from=2026-11-02&to=2026-11-03`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown ticker", async () => {
    expect((await fetch(`${base}/api/stocks/NOPE`)).status).toBe(404);
  });

  it.each([
    ["range=2d"],
    ["interval=2h"],
    ["range=1d&range=5d"],
  ])("returns 400 for %s", async (qs) => {
    expect((await fetch(`${base}/api/stocks/AAPL?${qs}`)).status).toBe(400);
  });

  it("returns 400 for malformed ticker", async () => {
    expect((await fetch(`${base}/api/stocks/%24%24%24`)).status).toBe(400);
  });

  it("maps upstream failures", async () => {
    expect((await fetch(`${base}/api/stocks/LIMIT`)).status).toBe(429);
    expect((await fetch(`${base}/api/stocks/BOOM`)).status).toBe(502);
  });
});
