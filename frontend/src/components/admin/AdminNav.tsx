import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

export interface AdminNavProps {
  lastUpdated?: Date | null;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function AdminNav({ lastUpdated, isFetching = false, onRefresh }: AdminNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { to: "/admin/knowledge", label: t("admin.nav_knowledge", "Knowledge Base"), icon: "ph:books" },
    { to: "/admin/safe-actions", label: t("admin.nav_safe_actions", "Safe Actions"), icon: "ph:shield-check" },
    { to: "/admin/quality", label: t("admin.nav_quality", "Quality & Evals"), icon: "ph:chart-bar" },
    { to: "/admin/users", label: t("admin.nav_users", "Users & Roles"), icon: "ph:users" },
    { to: "/admin/api-keys", label: t("admin.nav_api_keys", "Partner API Keys"), icon: "ph:key" },
    { to: "/admin/audit", label: t("admin.nav_audit", "Audit Log"), icon: "ph:clock-counter-clockwise" },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            data-testid="admin-pill-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
          >
            <Icon icon="ph:shield-chevron" className="h-4 w-4" />
            <span>Admin Console</span>
          </span>

          <span
            data-testid="simulated-pill-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Simulated data (simulated-v1)</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-text hover:bg-surface-hover transition-colors"
            title="OpenAPI Docs (Swagger UI)"
          >
            <Icon icon="ph:code" className="h-3.5 w-3.5 text-brand" />
            <span>OpenAPI Docs</span>
            <Icon icon="ph:arrow-square-out" className="h-3 w-3 opacity-60" />
          </a>

          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                {t("common.last_updated", "Updated")}:{" "}
                <time dateTime={lastUpdated.toISOString()} className="font-mono text-text">
                  {lastUpdated.toLocaleTimeString()}
                </time>
              </span>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isFetching}
                  title={t("common.refresh", "Refresh now")}
                  aria-label={t("common.refresh", "Refresh now")}
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
      </div>

      <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Admin navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted hover:bg-surface hover:text-text"
              }`
            }
          >
            <Icon icon={item.icon} className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

