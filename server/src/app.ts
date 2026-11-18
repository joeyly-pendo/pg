import express from "express";
import { aggregate } from "./aggregate.js";
import { createCachedFetcher } from "./cache.js";
import { TickerNotFoundError, UpstreamError } from "./errors.js";
import { parseParams } from "./params.js";
import { fetchSeries, type FetchSeries } from "./yahoo.js";

export function createApp(fetcher: FetchSeries = createCachedFetcher(fetchSeries)) {
  const app = express();

  app.get("/api/stocks/:ticker", async (req, res) => {
    const parsed = parseParams(req.params.ticker, req.query);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.message });
      return;
    }

    try {
      const series = await fetcher(parsed.ticker, parsed.window);
      res.json({
        ticker: series.symbol,
        ...(parsed.window.kind === "preset"
          ? { range: parsed.window.range }
          : { from: parsed.window.from, to: parsed.window.to }),
        interval: parsed.interval,
        timezone: series.timezone,
        points: aggregate(series, parsed.interval),
      });
    } catch (err) {
      if (err instanceof TickerNotFoundError) {
        res.status(404).json({ error: err.message });
      } else if (err instanceof UpstreamError) {
        res.status(err.status === 429 ? 429 : 502).json({ error: err.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return app;
}
