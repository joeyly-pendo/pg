import { useEffect, useState } from "react";
import type { Interval, Point } from "./api";
import { formatTime, price, volume } from "./format";

const PAGE_SIZES = [10, 25, 50, 100];

export function DataTable({ points, interval }: { points: Point[]; interval: Interval }) {
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(points.length / pageSize));

  useEffect(() => {
    setPage(0);
  }, [points]);

  const current = Math.min(page, pageCount - 1);
  const start = current * pageSize;
  const rows = points.slice(start, start + pageSize);

  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{interval === "24h" ? "Day" : "Time"}</th>
              <th className="num">Low avg</th>
              <th className="num">High avg</th>
              <th className="num">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.time}>
                <td>{formatTime(p.time, interval)}</td>
                <td className="num">{price(p.lowAverage)}</td>
                <td className="num">{price(p.highAverage)}</td>
                <td className="num">{volume(p.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <label>
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="range-label">
          {start + 1}–{Math.min(start + pageSize, points.length)} of {points.length}
        </span>
        <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0}>
          Prev
        </button>
        <span>
          Page {current + 1} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => setPage(current + 1)}
          disabled={current >= pageCount - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
