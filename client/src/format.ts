import type { Interval } from "./api";

export function formatTime(time: string, interval: Interval): string {
  const [date, hour] = time.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return interval === "24h" || !hour ? label : `${label} ${hour}`;
}

export const price = (n: number) => n.toFixed(2);
export const volume = (n: number) => n.toLocaleString("en-US");
