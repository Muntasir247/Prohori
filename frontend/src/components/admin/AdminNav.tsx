import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

import { WorkbenchNav } from "@/components/WorkbenchNav";

export interface AdminNavProps {
  lastUpdated?: Date | null;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function AdminNav({ lastUpdated, isFetching = false, onRefresh }: AdminNavProps) {
  const { t } = useTranslation();

  // Icons from Doc 01 §6.
  const items = [
    { to: "/admin/knowledge", label: t("admin.nav_knowledge", "Knowledge Base"), icon: "ph:books" },
    { to: "/admin/safe-actions", label: t("admin.nav_safe_actions", "Safe Actions"), icon: "ph:list-checks" },
    { to: "/admin/quality", label: t("admin.nav_quality", "Quality & Evals"), icon: "ph:gauge" },
    { to: "/admin/users", label: t("admin.nav_users", "Users & Roles"), icon: "ph:users-three" },
    { to: "/admin/api-keys", label: t("admin.nav_api_keys", "Partner API Keys"), icon: "ph:key" },
    { to: "/admin/audit", label: t("admin.nav_audit", "Audit Log"), icon: "ph:list-magnifying-glass" },
  ];

  return (
    <WorkbenchNav
      title="Admin console"
      items={items}
      ariaLabel="Admin navigation"
      lastUpdated={lastUpdated}
      isFetching={isFetching}
      onRefresh={onRefresh}
      extra={
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="admin-pill-badge"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-text-2 transition-colors duration-[120ms] hover:border-border-strong hover:text-text"
        >
          <Icon icon="ph:code" className="text-base" aria-hidden />
          <span>OpenAPI docs</span>
          <Icon icon="ph:arrow-square-out" className="text-sm" aria-hidden />
        </a>
      }
    />
  );
}
