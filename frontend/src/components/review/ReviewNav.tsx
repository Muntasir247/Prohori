import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

export interface ReviewNavProps {
  lastUpdated?: Date | null;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function ReviewNav({ lastUpdated, isFetching = false, onRefresh }: ReviewNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { to: "/review", label: t("review.nav_overview", "Overview"), icon: "ph:chart-line-up", end: true },
    { to: "/review/numbers", label: t("review.nav_numbers", "Repeat Numbers"), icon: "ph:phone-call" },
    { to: "/review/campaigns", label: t("review.nav_campaigns", "Campaigns"), icon: "ph:users-three" },
    { to: "/review/reports", label: t("review.nav_reports", "Reports & Export"), icon: "ph:file-arrow-down" },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            data-testid="simulated-pill-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Simulated data (simulated-v1)</span>
          </span>

          <span className="text-xs text-muted">· Polling every 60s</span>
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>
              {t("review.last_updated", "Last updated")}:{" "}
              <time dateTime={lastUpdated.toISOString()} className="font-mono text-text">
                {lastUpdated.toLocaleTimeString()}
              </time>
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isFetching}
                title={t("review.refresh", "Refresh now")}
                aria-label={t("review.refresh", "Refresh now")}
                className="rounded p-1 hover:bg-surface hover:text-text transition-colors disabled:opacity-50"
              >
                <Icon
                  icon="ph:arrow-clockwise"
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-brand" : ""}`}
                />
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Reviewer navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted hover:bg-surface hover:text-text"
              }`
            }
          >
            <Icon icon={item.icon} className="h-4 w-4" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export default ReviewNav;

