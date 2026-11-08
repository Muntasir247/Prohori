import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";
import { ChartContainer } from "./ChartContainer";
import type { CasesByRiskItem } from "@/features/analytics/types";

export interface CasesByRiskChartProps {
  data: CasesByRiskItem[];
  simulated?: boolean;
}

export function CasesByRiskChart({ data, simulated = true }: CasesByRiskChartProps) {
  const { t } = useTranslation();
  const isEmpty = !data || data.length === 0 || data.every((d) => d.total === 0);

  const table = (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-border text-muted">
          <th className="py-2 pr-4">{t("review.date", "Date")}</th>
          <th className="py-2 pr-4 text-risk-high">{t("risk.high", "High")}</th>
          <th className="py-2 pr-4 text-risk-medium">{t("risk.medium", "Medium")}</th>
          <th className="py-2 pr-4 text-risk-low">{t("risk.low", "Low")}</th>
          <th className="py-2 text-right">{t("review.total", "Total")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {data.map((row) => (
          <tr key={row.date} className="hover:bg-bg/50">
            <td className="py-2 pr-4 font-mono">{row.date}</td>
            <td className="py-2 pr-4 text-risk-high font-medium">{row.high}</td>
            <td className="py-2 pr-4 text-risk-medium font-medium">{row.medium}</td>
            <td className="py-2 pr-4 text-risk-low font-medium">{row.low}</td>
            <td className="py-2 text-right font-medium">{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartContainer
      title={t("review.cases_by_risk_title", "Cases by Risk Level")}
      subtitle={t("review.cases_by_risk_subtitle", "Daily distribution of reported cases across risk levels")}
      isEmpty={isEmpty}
      emptyMessage={t("review.empty_cases_by_risk", "No cases recorded in this date range.")}
      tableContent={table}
      simulated={simulated}
    >
      <div className="h-64 w-full" data-testid="cases-by-risk-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
            <Bar dataKey="high" name={t("risk.high", "High")} stackId="a" fill="var(--color-risk-high)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="medium" name={t("risk.medium", "Medium")} stackId="a" fill="var(--color-risk-medium)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="low" name={t("risk.low", "Low")} stackId="a" fill="var(--color-risk-low)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
export default CasesByRiskChart;

