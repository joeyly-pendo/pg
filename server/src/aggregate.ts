import type { Interval, Point, Series } from "./types.js";

const round = (n: number) => Math.round(n * 10_000) / 10_000;

function bucketHour(hour: number, interval: Interval): number | null {
  if (interval === "24h") return null;
  return hour;
}

export function aggregate(series: Series, interval: Interval): Point[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: series.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const buckets = new Map<string, { lows: number[]; highs: number[]; volume: number }>();

  for (const bar of series.bars) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(bar.ts * 1000)).map((p) => [p.type, p.value]),
    );
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const hour = bucketHour(Number(parts.hour), interval);
    const key = hour === null ? day : `${day}T${String(hour).padStart(2, "0")}:00`;

    const bucket = buckets.get(key) ?? { lows: [], highs: [], volume: 0 };
    bucket.lows.push(bar.low);
    bucket.highs.push(bar.high);
    bucket.volume += bar.volume;
    buckets.set(key, bucket);
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  return [...buckets.entries()].map(([time, b]) => ({
    time,
    lowAverage: round(mean(b.lows)),
    highAverage: round(mean(b.highs)),
    volume: b.volume,
  }));
}
