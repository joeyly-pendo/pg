export const RANGES = ["1d", "5d", "1mo"] as const;
export const INTERVALS = ["1h", "24h"] as const;

export type Range = (typeof RANGES)[number];
export type Interval = (typeof INTERVALS)[number];

export interface Bar {
  ts: number;
  low: number;
  high: number;
  volume: number;
}

export interface Series {
  symbol: string;
  timezone: string;
  bars: Bar[];
}

export interface Point {
  time: string;
  lowAverage: number;
  highAverage: number;
  volume: number;
}

export type DateWindow =
  | { kind: "preset"; range: Range }
  | { kind: "custom"; from: string; to: string };

export const MAX_HOURLY_DAYS = 5;

export function windowDays(w: DateWindow): number {
  if (w.kind === "preset") return w.range === "1d" ? 1 : w.range === "5d" ? 5 : Infinity;
  return (Date.parse(w.to) - Date.parse(w.from)) / 86_400_000 + 1;
}

export function hourlyAllowed(w: DateWindow): boolean {
  return windowDays(w) <= MAX_HOURLY_DAYS;
}

export function windowKey(ticker: string, w: DateWindow): string {
  return w.kind === "preset" ? `${ticker}|${w.range}` : `${ticker}|${w.from}|${w.to}`;
}
