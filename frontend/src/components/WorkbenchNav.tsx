import { Icon } from "@iconify/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

// Shared header for the reviewer and admin workbenches.
// Underline tabs (Doc 01 §7 Tabs: 44 px, 2 px Lantern underline) that scroll
// horizontally on small screens, plus the mandatory "Simulated data" badge.
export interface WorkbenchNavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

export interface WorkbenchNavProps {
  title: string;
  items: WorkbenchNavItem[];
  ariaLabel: string;
  lastUpdated?: Date | null;
  isFetching?: boolean;
  onRefresh?: () => void;
  extra?: ReactNode;
}

export function SimulatedBadge() {
  return (
    <span
      data-testid="simulated-pill-badge"
      className="inline-flex items-center gap-1.5 rounded-sm border border-warning/40 bg-warning-tint px-2 py-0.5 text-xs font-medium text-warning"
    >
      <Icon icon="ph:flask" className="text-sm" aria-hidden />
      <span>Simulated data (simulated-v1)</span>
    </span>
  );
}

export function WorkbenchNav({
  title,
  items,
  ariaLabel,
  lastUpdated,
  isFetching = false,
  onRefresh,
  extra,
}: WorkbenchNavProps) {
  const { t } = useTranslation();

  return (
    <div className="-mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-text-2">{title}</span>
          <SimulatedBadge />
        </div>

        <div className="flex items-center gap-3">
          {extra}
          {lastUpdated && (
            <div className="flex items-center gap-1 text-sm text-text-2">
              <span>
                {t("review.last_updated", "Last updated")}{" "}
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
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-2 transition-colors duration-[120ms] hover:bg-surface-2 hover:text-text disabled:opacity-50"
                >
                  <Icon
                    icon="ph:arrow-clockwise"
                    className={`text-lg ${isFetching ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label={ariaLabel}
        className="-mx-4 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        <ul className="flex min-w-max gap-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative inline-flex min-h-11 items-center gap-2 px-3 text-[15px] font-medium transition-colors duration-[120ms] ${
                    isActive
                      ? "text-text after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent"
                      : "text-text-2 hover:text-text"
                  }`
                }
              >
                <Icon icon={item.icon} className="text-lg" aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
