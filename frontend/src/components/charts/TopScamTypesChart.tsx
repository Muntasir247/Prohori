import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";
import { ChartContainer } from "./ChartContainer";
import type { TopScamTypeItem } from "@/features/analytics/types";

export interface TopScamTypesChartProps {
  data: TopScamTypeItem[];
  simulated?: boolean;
}

const BAR_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function TopScamTypesChart({ data, simulated = true }: TopScamTypesChartProps) {
  const { t, i18n } = useTranslation();
  const isEmpty = !data || data.length === 0 || data.every((d) => d.count === 0);

  const localizedData = data.map((item) => ({
    ...item,
    displayName: i18n.language === "bn" ? item.name_bn || item.name_en : item.name_en,
  }));

  const table = (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-border text-muted">
          <th className="py-2 pr-4">{t("review.scam_type", "Scam Type")}</th>
          <th className="py-2 pr-4 text-right">{t("review.count", "Count")}</th>
          <th className="py-2 text-right">{t("review.share", "Share")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {localizedData.map((row) => (
          <tr key={row.slug} className="hover:bg-bg/50">
            <td className="py-2 pr-4 font-medium">{row.displayName}</td>
            <td className="py-2 pr-4 text-right">{row.count}</td>
            <td className="py-2 text-right text-muted">{row.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartContainer
      title={t("review.top_scam_types_title", "Top Scam Types")}
      subtitle={t("review.top_scam_types_subtitle", "Top 5 patterns detected + aggregated others")}
      isEmpty={isEmpty}
      emptyMessage={t("review.empty_scam_types", "No scam types recorded in this range.")}
      tableContent={table}
      simulated={simulated}
    >
      <div className="h-64 w-full" data-testid="top-scam-types-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={localizedData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={{ stroke: "var(--chart-grid)" }} allowDecimals={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="displayName"
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={{ stroke: "var(--chart-grid)" }}
              width={110}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                borderRadius: "8px", color: "var(--color-text)",
                fontSize: "0.75rem",
              }}
              formatter={(value, _name, entry) => [
                `${value} (${(entry as { payload?: { percentage?: number } })?.payload?.percentage?.toFixed(1) ?? "0"}%)`,
                t("review.cases_count", "Cases"),
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {localizedData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
export default TopScamTypesChart;
