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
import type { ReviewerDecisionSeriesItem } from "@/features/analytics/types";

export interface ReviewerDecisionsChartProps {
  data: ReviewerDecisionSeriesItem[];
  simulated?: boolean;
}

export function ReviewerDecisionsChart({
  data,
  simulated = true,
}: ReviewerDecisionsChartProps) {
  const { t } = useTranslation();
  const isEmpty = !data || data.length === 0 || data.every((d) => d.total === 0);

  const table = (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-border text-muted">
          <th className="py-2 pr-4">{t("review.date", "Date")}</th>
          <th className="py-2 pr-4 text-text">{t("review.confirmed_scam", "Confirmed Scam")}</th>
          <th className="py-2 pr-4 text-text-2">{t("review.not_scam", "Not a Scam")}</th>
          <th className="py-2 pr-4 text-warning">{t("review.escalated", "Escalated")}</th>
          <th className="py-2 pr-4 text-muted">{t("review.closed", "Closed")}</th>
          <th className="py-2 text-right">{t("review.total", "Total")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {data.map((row) => (
          <tr key={row.date} className="hover:bg-bg/50">
            <td className="py-2 pr-4 font-mono">{row.date}</td>
            <td className="py-2 pr-4 text-text font-medium">{row.confirmed_scam}</td>
            <td className="py-2 pr-4 text-text-2 font-medium">{row.not_a_scam}</td>
            <td className="py-2 pr-4 text-warning font-medium">{row.needs_escalation}</td>
            <td className="py-2 pr-4 text-muted font-medium">{row.closed}</td>
            <td className="py-2 text-right font-medium">{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartContainer
      title={t("review.reviewer_decisions_title", "Reviewer Decisions Over Time")}
      subtitle={t("review.reviewer_decisions_subtitle", "Daily breakdown of case outcomes finalized by fraud review team")}
      isEmpty={isEmpty}
      emptyMessage={t("review.empty_reviewer_decisions", "No reviewer decisions recorded in this date range.")}
      tableContent={table}
      simulated={simulated}
    >
      <div className="h-64 w-full" data-testid="reviewer-decisions-chart">
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
            <Bar
              dataKey="confirmed_scam"
              name={t("review.confirmed_scam", "Confirmed Scam")}
              stackId="decisions"
              fill="var(--color-pine-hover)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="not_a_scam"
              name={t("review.not_scam", "Not a Scam")}
              stackId="decisions"
              fill="var(--color-text-2)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="needs_escalation"
              name={t("review.escalated", "Needs Escalation")}
              stackId="decisions"
              fill="var(--color-risk-medium)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="closed"
              name={t("review.closed", "Closed")}
              stackId="decisions"
              fill="var(--color-border-strong)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
export default ReviewerDecisionsChart;

