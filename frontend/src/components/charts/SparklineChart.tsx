import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { SparklinePoint } from "@/features/analytics/types";

export interface SparklineChartProps {
  data: SparklinePoint[];
}

export function SparklineChart({ data }: SparklineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-muted">
        No recent activity
      </div>
    );
  }

  return (
    <div className="h-16 w-full" data-testid="sparkline-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface, #13211E)",
              borderColor: "var(--color-border, #243E36)",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
              padding: "0.25rem 0.5rem",
            }}
            formatter={(val: unknown) => [String(val), "Checks"]}
            labelFormatter={(label: unknown) => `Date: ${String(label)}`}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export default SparklineChart;
