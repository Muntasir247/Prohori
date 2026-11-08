import { Icon } from "@iconify/react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  tableContent?: ReactNode;
  simulated?: boolean;
}

export function ChartContainer({
  title,
  subtitle,
  isEmpty = false,
  emptyMessage,
  children,
  tableContent,
  simulated = true,
}: ChartContainerProps) {
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text">{title}</h3>
            {simulated && (
              <span
                data-testid="simulated-badge"
                className="inline-flex items-center gap-1 rounded-sm border border-warning/40 bg-warning-tint px-2 py-0.5 text-xs font-medium text-warning"
                title="Model data running simulated-v1"
              >
                <Icon icon="ph:flask" className="h-3 w-3" aria-hidden />
                <span>Simulated data (simulated-v1)</span>
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
        </div>

        {tableContent && !isEmpty && (
          <button
            type="button"
            aria-label="Toggle data table"
            aria-pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
              showTable
                ? "border-border-strong bg-surface-2 text-text"
                : "border-border bg-surface text-text-2 hover:border-border-strong hover:text-text"
            }`}
          >
            <Icon icon={showTable ? "ph:chart-bar" : "ph:table"} className="h-3.5 w-3.5" aria-hidden />
            <span>{showTable ? t("review.show_chart", "Show chart") : t("review.show_table", "Data table")}</span>
          </button>
        )}
      </div>

      <div className="min-h-[260px] flex flex-1 flex-col justify-center">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 text-text-2">
              <Icon icon="ph:chart-bar" className="h-8 w-8" aria-hidden />
            </div>
            <p className="text-sm font-medium text-text">
              {emptyMessage || t("review.empty_chart", "No data in this range.")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t("review.empty_chart_desc", "Try adjusting the date range or clear active filters.")}
            </p>
          </div>
        ) : showTable && tableContent ? (
          <div className="overflow-x-auto">{tableContent}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

