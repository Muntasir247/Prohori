import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

import { useHealth } from "@/features/checks/useHealth";

// Phase 01 home screen: proves the frontend reaches the backend through the
// Vite /api proxy by rendering GET /api/v1/health. Replaced by S01 Landing in
// Phase 07.
export default function Landing() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useHealth();

  const connected = !isError && data?.status === "ok";

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-brand">{t("app.name")}</h1>
        <p className="text-sm text-muted">{t("app.tagline")}</p>
      </header>

      <section
        className="rounded-xl border border-border bg-surface p-5"
        aria-live="polite"
      >
        <h2 className="mb-3 text-lg font-medium">{t("home.title")}</h2>

        {isLoading ? (
          <p className="flex items-center gap-2 text-muted">
            <Icon icon="ph:spinner" className="animate-spin" aria-hidden />
            {t("home.health_checking")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p
              className="flex items-center gap-2 font-medium"
              data-testid="health-status"
            >
              <Icon
                icon={connected ? "ph:check-circle" : "ph:warning-circle"}
                className={connected ? "text-brand" : "text-muted"}
                aria-hidden
              />
              {connected ? t("home.health_ok") : t("home.health_down")}
            </p>
            {data && (
              <dl className="grid grid-cols-2 gap-1 text-sm text-muted">
                <dt>{t("home.database")}</dt>
                <dd>{data.database === "up" ? t("home.up") : t("home.down")}</dd>
                <dt>{t("home.version")}</dt>
                <dd>{data.version}</dd>
              </dl>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
