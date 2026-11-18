import { FormEvent, useEffect, useState } from "react";
import {
  ApiError,
  fetchStock,
  type DateWindow,
  type Interval,
  type Range,
  type StockResponse,
} from "./api";
import { DataTable } from "./DataTable";
import { PriceChart } from "./PriceChart";
import { Toasts, useToasts } from "./Toasts";

type RangeChoice = Range | "custom";

const RANGES: { value: RangeChoice; label: string }[] = [
  { value: "1d", label: "1 day" },
  { value: "5d", label: "5 days" },
  { value: "1mo", label: "1 month" },
  { value: "custom", label: "Custom" },
];

const MAX_LOOKBACK_DAYS = 728;
const MAX_HOURLY_DAYS = 5;

const PRESET_DAYS: Record<Range, number> = { "1d": 1, "5d": 5, "1mo": Infinity };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
];

export function App() {
  const [input, setInput] = useState("AAPL");
  const [ticker, setTicker] = useState("AAPL");
  const [range, setRange] = useState<RangeChoice>("5d");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(daysAgo(0));
  const [interval, setInterval] = useState<Interval>("1h");
  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tickerError, setTickerError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const dateError =
    range !== "custom"
      ? null
      : !from || !to
        ? "Select both dates"
        : from > to
          ? "From must be on or before To"
          : null;

  const windowDays =
    range !== "custom"
      ? PRESET_DAYS[range]
      : dateError
        ? 0
        : (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  const hourlyAllowed = windowDays <= MAX_HOURLY_DAYS;
  const effectiveInterval: Interval = hourlyAllowed ? interval : "24h";

  useEffect(() => {
    if (dateError) return;
    const controller = new AbortController();
    setLoading(true);
    setTickerError(null);

    const window: DateWindow = range === "custom" ? { from, to } : { range };
    fetchStock(ticker, window, effectiveInterval, controller.signal)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setData(null);
        if (err instanceof ApiError && err.status === 404) {
          setTickerError(`No results for "${ticker}"`);
        } else {
          push(err instanceof Error ? err.message : "Something went wrong");
        }
      });

    return () => controller.abort();
  }, [ticker, range, from, to, effectiveInterval, dateError, push]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = input.trim().toUpperCase();
    if (!next) {
      setTickerError("Enter a ticker");
      return;
    }
    setInput(next);
    setTicker(next);
  };

  return (
    <main>
      <h1>Intraday prices</h1>

      <form className="controls" onSubmit={onSubmit}>
        <label>
          Ticker
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={tickerError !== null}
            placeholder="e.g. AAPL"
            autoFocus
          />
        </label>
        <button type="submit" disabled={loading}>
          Search
        </button>
        {tickerError && (
          <span className="field-error" role="alert">
            {tickerError}
          </span>
        )}
        <label className="push">
          Range
          <select value={range} onChange={(e) => setRange(e.target.value as RangeChoice)}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {range === "custom" && (
          <>
            <label>
              From
              <input
                type="date"
                value={from}
                min={daysAgo(MAX_LOOKBACK_DAYS)}
                max={daysAgo(0)}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                max={daysAgo(0)}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            {dateError && (
              <span className="field-error" role="alert">
                {dateError}
              </span>
            )}
          </>
        )}
        <label>
          Granularity
          <select
            value={effectiveInterval}
            onChange={(e) => setInterval(e.target.value as Interval)}
          >
            {INTERVALS.map((i) => (
              <option
                key={i.value}
                value={i.value}
                disabled={i.value === "1h" && !hourlyAllowed}
                title={
                  i.value === "1h" && !hourlyAllowed
                    ? `1 hour is only available for ranges up to ${MAX_HOURLY_DAYS} days`
                    : undefined
                }
              >
                {i.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {loading && <p className="status">Loading…</p>}

      {data && !loading && (
        <>
          <h2>
            {data.ticker} <small>({data.timezone})</small>
          </h2>
          {data.points.length === 0 ? (
            <p className="status">No data for this selection.</p>
          ) : (
            <>
              <PriceChart points={data.points} interval={data.interval} />
              <DataTable points={data.points} interval={data.interval} />
            </>
          )}
        </>
      )}

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
