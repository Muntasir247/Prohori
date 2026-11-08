import { useTranslation } from "react-i18next";

import { WorkbenchNav } from "@/components/WorkbenchNav";

export interface ReviewNavProps {
  lastUpdated?: Date | null;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function ReviewNav({ lastUpdated, isFetching = false, onRefresh }: ReviewNavProps) {
  const { t } = useTranslation();

  // Icons from Doc 01 §6.
  const items = [
    { to: "/review", label: t("review.nav_overview", "Overview"), icon: "ph:squares-four", end: true },
    { to: "/review/cases", label: t("review.nav_cases", "Case Queue"), icon: "ph:tray" },
    { to: "/review/numbers", label: t("review.nav_numbers", "Repeat Numbers"), icon: "ph:repeat" },
    { to: "/review/campaigns", label: t("review.nav_campaigns", "Campaigns"), icon: "ph:graph" },
    { to: "/review/reports", label: t("review.nav_reports", "Reports & Export"), icon: "ph:file-csv" },
  ];

  return (
    <WorkbenchNav
      title={t("review.workbench_nav", "Review workbench")}
      items={items}
      ariaLabel="Reviewer navigation"
      lastUpdated={lastUpdated}
      isFetching={isFetching}
      onRefresh={onRefresh}
    />
  );
}
export default ReviewNav;
