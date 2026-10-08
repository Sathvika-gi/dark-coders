"use client";
/**
 * components/TempChart.tsx
 * Recharts line chart for temperature readings.
 * Shows a reference band for the optimal temperature.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

interface TelemetryRow {
  recorded_at: string;
  temp_c: number;
  humidity_pct: number;
}

interface TempChartProps {
  data: TelemetryRow[];
  tRef: number;
}

function formatTs(ts: string): string {
  try {
    return format(new Date(ts), "HH:mm");
  } catch {
    return ts;
  }
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(11,15,26,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ color: "#94a3b8", margin: "0 0 4px 0" }}>{label}</p>
      <p style={{ color: "#f87171", margin: 0, fontWeight: 600 }}>
        {payload[0]?.value?.toFixed(1)}°C
      </p>
    </div>
  );
}

export function TempChart({ data, tRef }: TempChartProps) {
  if (!data.length) {
    return (
      <div
        style={{
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontSize: 14,
        }}
      >
        No telemetry yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    time: formatTs(d.recorded_at),
    temp: d.temp_c,
  }));

  // Find spike threshold (> tRef + 15)
  const spikeThreshold = tRef + 15;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="time"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
          tickFormatter={(v) => `${v}°`}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Reference line for tRef (optimal) */}
        <ReferenceLine
          y={tRef}
          stroke="#10b981"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ value: `Ideal ${tRef}°C`, fill: "#10b981", fontSize: 10, position: "insideTopRight" }}
        />
        {/* Reference line for spike threshold */}
        <ReferenceLine
          y={spikeThreshold}
          stroke="#ef4444"
          strokeDasharray="3 3"
          strokeWidth={1}
          label={{ value: "Spike", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
        />
        <Line
          type="monotone"
          dataKey="temp"
          stroke="#f87171"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: { temp: number } };
            if (payload.temp > spikeThreshold) {
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="#ef4444"
                  stroke="#fca5a5"
                  strokeWidth={2}
                />
              );
            }
            return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="#f87171" />;
          }}
          activeDot={{ r: 5, fill: "#ef4444" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
