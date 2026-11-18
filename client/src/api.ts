export type Range = "1d" | "5d" | "1mo";
export type Interval = "1h" | "24h";

export interface Point {
  time: string;
  lowAverage: number;
  highAverage: number;
  volume: number;
}

export type DateWindow = { range: Range } | { from: string; to: string };

export interface StockResponse {
  ticker: string;
  interval: Interval;
  timezone: string;
  points: Point[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchStock(
  ticker: string,
  window: DateWindow,
  interval: Interval,
  signal: AbortSignal,
): Promise<StockResponse> {
  const qs = new URLSearchParams({ ...window, interval });
  let res: Response;
  try {
    res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}?${qs}`, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Network error: could not reach the server", 0);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = `Request failed (${res.status})`;
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as StockResponse;
}
