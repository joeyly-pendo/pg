import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Label,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Interval, Point } from "./api";
import { formatTime, price, volume } from "./format";

export function PriceChart({ points, interval }: { points: Point[]; interval: Interval }) {
  const data = points.map((p) => ({ ...p, label: formatTime(p.time, interval) }));

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="price"
            domain={["auto", "auto"]}
            tickFormatter={price}
            tick={{ fontSize: 12 }}
          >
            <Label value="Price" angle={-90} position="insideLeft" offset={-4} style={{ textAnchor: "middle" }} />
          </YAxis>
          <YAxis
            yAxisId="volume"
            orientation="right"
            tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)}M`}
            tick={{ fontSize: 12 }}
          >
            <Label value="Volume (shares)" angle={90} position="insideRight" offset={-4} style={{ textAnchor: "middle" }} />
          </YAxis>
          <Tooltip
            formatter={(value, name) =>
              name === "Volume" ? volume(Number(value)) : price(Number(value))
            }
          />
          <Legend />
          <Bar yAxisId="volume" dataKey="volume" name="Volume" fill="#cbd5e1" />
          <Line
            yAxisId="price"
            dataKey="highAverage"
            name="High avg"
            stroke="#16a34a"
            dot={false}
            strokeWidth={2}
          />
          <Line
            yAxisId="price"
            dataKey="lowAverage"
            name="Low avg"
            stroke="#dc2626"
            dot={false}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
