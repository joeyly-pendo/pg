import { LRUCache } from "lru-cache";
import { windowKey, type DateWindow, type Series } from "./types.js";
import type { FetchSeries } from "./yahoo.js";

export const TTL_MS = 5 * 60 * 1000;
export const MAX_ENTRIES = 500;

export function createCachedFetcher(fetcher: FetchSeries, ttl = TTL_MS): FetchSeries {
  const cache = new LRUCache<string, Series>({ max: MAX_ENTRIES, ttl });
  const inflight = new Map<string, Promise<Series>>();

  return (ticker: string, window: DateWindow) => {
    const key = windowKey(ticker, window);
    const hit = cache.get(key);
    if (hit) return Promise.resolve(hit);

    const pending = inflight.get(key);
    if (pending) return pending;

    const request = fetcher(ticker, window)
      .then((series) => {
        cache.set(key, series);
        return series;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, request);
    return request;
  };
}
