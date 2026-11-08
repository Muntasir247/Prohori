import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import type { RiskLevel } from "@/features/checks/types";

interface RiskBadgeProps {
  level: RiskLevel;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const { t } = useTranslation();

  if (level === "High") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border border-risk-high/40 bg-risk-high-tint px-2 text-xs font-semibold text-risk-high">
        <Icon icon="ph:octagon-bold" className="text-sm" aria-hidden />
        {t("result.badge_high")}
      </span>
    );
  }

  if (level === "Medium") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border border-risk-medium/40 bg-risk-medium-tint px-2 text-xs font-semibold text-risk-medium">
        <Icon icon="ph:warning-bold" className="text-sm" aria-hidden />
        {t("result.badge_medium")}
      </span>
    );
  }

  if (level === "Low") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border border-risk-low/40 bg-risk-low-tint px-2 text-xs font-semibold text-risk-low">
        <Icon icon="ph:info-bold" className="text-sm" aria-hidden />
        {t("result.badge_low")}
      </span>
    );
  }

  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border border-info/40 bg-info-tint px-2 text-xs font-semibold text-info">
      <Icon icon="ph:cloud-slash-bold" className="text-sm" aria-hidden />
      {t("result.badge_unavailable")}
    </span>
  );
}

