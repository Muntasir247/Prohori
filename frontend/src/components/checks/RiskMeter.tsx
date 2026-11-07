import { useTranslation } from "react-i18next";
import type { RiskLevel } from "@/features/checks/types";

interface RiskMeterProps {
  level: RiskLevel;
}

export function RiskMeter({ level }: RiskMeterProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4"
      aria-label="Risk Meter"
      data-testid="risk-meter"
    >
      <div className="flex justify-between text-xs font-medium text-muted">
        <span className={level === "Low" ? "font-bold text-risk-low" : ""}>
          {t("result.meter_low")}
        </span>
        <span className={level === "Medium" ? "font-bold text-risk-medium" : ""}>
          {t("result.meter_medium")}
        </span>
        <span className={level === "High" ? "font-bold text-risk-high" : ""}>
          {t("result.meter_high")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2" role="progressbar" aria-valuenow={level === "Low" ? 1 : level === "Medium" ? 2 : level === "High" ? 3 : 0} aria-valuemin={0} aria-valuemax={3}>
        <div
          className={`h-2.5 rounded-full transition-colors ${
            level === "Low" || level === "Medium" || level === "High"
              ? "bg-risk-low"
              : "bg-surface-2"
          }`}
        />
        <div
          className={`h-2.5 rounded-full transition-colors ${
            level === "Medium" || level === "High"
              ? "bg-risk-medium"
              : "bg-surface-2"
          }`}
        />
        <div
          className={`h-2.5 rounded-full transition-colors ${
            level === "High" ? "bg-risk-high" : "bg-surface-2"
          }`}
        />
      </div>
    </div>
  );
}

