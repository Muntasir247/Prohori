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
          <th className="py-2 pr-4 text-red-600 dark:text-red-400">{t("review.confirmed_scam", "Confirmed Scam")}</th>
          <th className="py-2 pr-4 text-emerald-600 dark:text-emerald-400">{t("review.not_scam", "Not a Scam")}</th>
          <th className="py-2 pr-4 text-amber-600 dark:text-amber-400">{t("review.escalated", "Escalated")}</th>
          <th className="py-2 pr-4 text-muted">{t("review.closed", "Closed")}</th>
          <th className="py-2 text-right">{t("review.total", "Total")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {data.map((row) => (
          <tr key={row.date} className="hover:bg-bg/50">
            <td className="py-2 pr-4 font-mono">{row.date}</td>
            <td className="py-2 pr-4 text-red-600 dark:text-red-400 font-medium">{row.confirmed_scam}</td>
            <td className="py-2 pr-4 text-emerald-600 dark:text-emerald-400 font-medium">{row.not_a_scam}</td>
            <td className="py-2 pr-4 text-amber-600 dark:text-amber-400 font-medium">{row.needs_escalation}</td>
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
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface, #13211E)",
                borderColor: "var(--color-border, #243E36)",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
            <Bar
              dataKey="confirmed_scam"
              name={t("review.confirmed_scam", "Confirmed Scam")}
              stackId="decisions"
              fill="#EF4444"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="not_a_scam"
              name={t("review.not_scam", "Not a Scam")}
              stackId="decisions"
              fill="#10B981"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="needs_escalation"
              name={t("review.escalated", "Needs Escalation")}
              stackId="decisions"
              fill="#F59E0B"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="closed"
              name={t("review.closed", "Closed")}
              stackId="decisions"
              fill="#64748B"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
export default ReviewerDecisionsChart;

