import {
  INTERVALS,
  MAX_HOURLY_DAYS,
  RANGES,
  hourlyAllowed,
  type DateWindow,
  type Interval,
  type Range,
} from "./types.js";

const TICKER_RE = /^[A-Z0-9][A-Z0-9.^=-]{0,14}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export const MAX_LOOKBACK_DAYS = 728;

export type Parsed =
  | { ok: true; ticker: string; interval: Interval; window: DateWindow }
  | { ok: false; message: string };

const HOURLY_MESSAGE = `1h interval is only available for ranges up to ${MAX_HOURLY_DAYS} days`;

function single(value: unknown, fallback: string | undefined): string | undefined {
  if (value === undefined) return fallback;
  return typeof value === "string" ? value : "";
}

function validDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function parseParams(
  rawTicker: string,
  query: Record<string, unknown>,
  now: Date = new Date(),
): Parsed {
  const ticker = rawTicker.trim().toUpperCase();
  if (!TICKER_RE.test(ticker)) return { ok: false, message: "Invalid ticker" };

  const rawInterval = single(query.interval, undefined);
  if (rawInterval !== undefined && !(INTERVALS as readonly string[]).includes(rawInterval)) {
    return { ok: false, message: `Invalid interval; expected one of ${INTERVALS.join(", ")}` };
  }

  const finish = (window: DateWindow): Parsed => {
    const interval = (rawInterval ?? (hourlyAllowed(window) ? "1h" : "24h")) as Interval;
    if (interval === "1h" && !hourlyAllowed(window)) return { ok: false, message: HOURLY_MESSAGE };
    return { ok: true, ticker, interval, window };
  };

  const from = single(query.from, undefined);
  const to = single(query.to, undefined);
  const range = single(query.range, undefined);

  if (from !== undefined || to !== undefined) {
    if (range !== undefined) {
      return { ok: false, message: "Use either range or from/to, not both" };
    }
    if (from === undefined || to === undefined) {
      return { ok: false, message: "Both from and to are required" };
    }
    if (!validDate(from) || !validDate(to)) {
      return { ok: false, message: "from and to must be valid dates in YYYY-MM-DD format" };
    }
    if (from > to) return { ok: false, message: "from must be on or before to" };

    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const earliest = new Date(today - MAX_LOOKBACK_DAYS * DAY_MS).toISOString().slice(0, 10);
    if (from < earliest) {
      return { ok: false, message: `from must be within the last ${MAX_LOOKBACK_DAYS} days` };
    }
    if (from > new Date(today).toISOString().slice(0, 10)) {
      return { ok: false, message: "from must not be in the future" };
    }

    return finish({ kind: "custom", from, to });
  }

  const preset = range ?? "5d";
  if (!(RANGES as readonly string[]).includes(preset)) {
    return { ok: false, message: `Invalid range; expected one of ${RANGES.join(", ")}` };
  }
  return finish({ kind: "preset", range: preset as Range });
}
