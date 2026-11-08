import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";
import { ChartContainer } from "./ChartContainer";
import type { RepeatNumberSeriesItem } from "@/features/analytics/types";

export interface RepeatNumbersChartProps {
  data: RepeatNumberSeriesItem[];
  simulated?: boolean;
}

export function RepeatNumbersChart({ data, simulated = true }: RepeatNumbersChartProps) {
  const { t } = useTranslation();
  const isEmpty = !data || data.length === 0 || data.every((d) => d.active_count === 0);

  const table = (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-border text-muted">
          <th className="py-2 pr-4">{t("review.date", "Date")}</th>
          <th className="py-2 text-right">{t("review.repeat_numbers_count", "Active Repeated Numbers")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {data.map((row) => (
          <tr key={row.date} className="hover:bg-bg/50">
            <td className="py-2 pr-4 font-mono">{row.date}</td>
            <td className="py-2 text-right font-medium text-warning">{row.active_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartContainer
      title={t("review.repeat_numbers_title", "Repeated Risky Numbers Over Time")}
      subtitle={t("review.repeat_numbers_subtitle", "Daily count of recurring risky numbers flagged in multiple reports")}
      isEmpty={isEmpty}
      emptyMessage={t("review.empty_repeat_numbers", "No repeated risky numbers flagged in this range.")}
      tableContent={table}
      simulated={simulated}
    >
      <div className="h-64 w-full" data-testid="repeat-numbers-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={{ stroke: "var(--chart-grid)" }} allowDecimals={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                borderRadius: "8px", color: "var(--color-text)",
                fontSize: "0.75rem",
              }}
              formatter={(val: unknown) => [String(val), t("review.active_numbers", "Active Numbers")]}
            />
            <Line
              type="monotone"
              dataKey="active_count"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--chart-1)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
export default RepeatNumbersChart;
