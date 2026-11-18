import { TickerNotFoundError, UpstreamError } from "./errors.js";
import type { Bar, DateWindow, Series } from "./types.js";

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const TIMEOUT_MS = 10_000;

interface YahooQuote {
  low: (number | null)[];
  high: (number | null)[];
  volume: (number | null)[];
}

interface YahooResponse {
  chart: {
    result:
      | {
          meta: { symbol: string; exchangeTimezoneName?: string; timezone?: string };
          timestamp?: number[];
          indicators: { quote: YahooQuote[] };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
}

export type FetchSeries = (ticker: string, window: DateWindow) => Promise<Series>;

const DAY_S = 86_400;

function buildUrl(ticker: string, window: DateWindow): string {
  const base = `${BASE}/${encodeURIComponent(ticker)}?interval=1h`;
  if (window.kind === "preset") return `${base}&range=${window.range}`;
  const start = Date.parse(`${window.from}T00:00:00Z`) / 1000 - DAY_S;
  const end = Math.min(
    Date.parse(`${window.to}T00:00:00Z`) / 1000 + 2 * DAY_S,
    Math.floor(Date.now() / 1000),
  );
  return `${base}&period1=${start}&period2=${end}`;
}

export const fetchSeries: FetchSeries = async (ticker, window) => {
  const url = buildUrl(ticker, window);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamError("Yahoo Finance unreachable", 502);
  }

  if (res.status === 404) throw new TickerNotFoundError(ticker);
  if (res.status === 429) throw new UpstreamError("Yahoo Finance rate limit reached", 429);

  let body: YahooResponse;
  try {
    body = (await res.json()) as YahooResponse;
  } catch {
    throw new UpstreamError(`Unexpected response from Yahoo Finance (${res.status})`, 502);
  }

  const { result, error } = body.chart ?? { result: null, error: null };
  if (error?.code === "Not Found") throw new TickerNotFoundError(ticker);
  if (error) throw new UpstreamError(error.description, 502);
  if (!res.ok) throw new UpstreamError(`Yahoo Finance returned ${res.status}`, 502);
  if (!result?.[0]) throw new TickerNotFoundError(ticker);

  const r = result[0];
  const quote = r.indicators.quote[0];
  const bars: Bar[] = [];
  (r.timestamp ?? []).forEach((ts, i) => {
    const low = quote?.low[i];
    const high = quote?.high[i];
    if (low == null || high == null) return;
    bars.push({ ts, low, high, volume: quote.volume[i] ?? 0 });
  });

  const timezone = r.meta.exchangeTimezoneName ?? r.meta.timezone ?? "UTC";
  return {
    symbol: r.meta.symbol,
    timezone,
    bars: window.kind === "custom" ? withinDays(bars, timezone, window.from, window.to) : bars,
  };
};

function withinDays(bars: Bar[], timeZone: string, from: string, to: string): Bar[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return bars.filter((b) => {
    const day = fmt.format(new Date(b.ts * 1000));
    return day >= from && day <= to;
  });
}
