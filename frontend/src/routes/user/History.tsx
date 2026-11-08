import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RiskBadge } from "@/components/checks/RiskBadge";
import { useSession } from "@/features/auth/useSession";
import { checksApi } from "@/features/checks/api";
import type { CheckHistoryItem } from "@/features/checks/types";

export default function History() {
  const { t } = useTranslation();
  const { data: user, isLoading: authLoading } = useSession();

  const [items, setItems] = useState<CheckHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("");

  useEffect(() => {
    if (user) {
      setLoading(true);
      checksApi
        .listChecks({
          level: levelFilter || undefined,
          kind: kindFilter || undefined,
          limit: 50,
        })
        .then((res) => setItems(res.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  }, [user, levelFilter, kindFilter]);

  if (authLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-12 text-center text-muted">
          <Icon icon="ph:spinner-bold" className="animate-spin text-3xl mx-auto" />
        </div>
      </AppShell>
    );
  }

  // Guests are prompted to sign in
  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-accent text-3xl">
            <Icon icon="ph:clock-counter-clockwise-bold" />
          </div>
          <h1 className="text-xl font-bold text-text">{t("history.guest_title")}</h1>
          <p className="text-xs text-muted max-w-sm">{t("history.guest_desc")}</p>
          <div className="flex gap-3 pt-2">
            <Link
              to="/login"
              className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-bg shadow hover:bg-accent/90"
            >
              {t("auth.sign_in")}
            </Link>
            <Link
              to="/check"
              className="rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-bold text-text hover:bg-surface-2"
            >
              {t("history.check_now")}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-4 flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {t("history.title")}
          </h1>
          <p className="text-xs text-muted">{t("history.subtitle")}</p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
          {/* Level Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted">{t("history.filter_level")}:</span>
            {(["", "High", "Medium", "Low"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  levelFilter === lvl
                    ? "bg-accent text-bg"
                    : "text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                {lvl ? t(`result.badge_${lvl.toLowerCase()}`) : t("history.filter_all")}
              </button>
            ))}
          </div>

          {/* Kind Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted">{t("history.filter_type")}:</span>
            {(["", "message", "payment"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  kindFilter === k
                    ? "bg-accent text-bg"
                    : "text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                {k ? t(`history.type_${k}`) : t("history.filter_all")}
              </button>
            ))}
          </div>
        </div>

        {/* History list */}
        {loading ? (
          <div className="py-12 text-center text-muted">
            <Icon icon="ph:spinner-bold" className="animate-spin text-2xl mx-auto" />
          </div>
        ) : items.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/history/${item.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-brand/50 transition-colors"
                data-testid="history-item-row"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <RiskBadge level={item.final_level} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-semibold text-text">
                      {item.masked_text || (item.amount_bdt ? `৳${item.amount_bdt}` : "Payment check")}
                    </span>
                    {item.scam_type && (
                      <span className="text-2xs text-muted">
                        {item.scam_type.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs text-muted border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                  {item.has_reported && (
                    <span className="flex items-center gap-1 text-2xs font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full border border-success/30">
                      <Icon icon="ph:check-bold" />
                      {t("history.reported_tag")}
                    </span>
                  )}
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <Icon icon="ph:caret-right-bold" className="text-muted" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center flex flex-col items-center gap-3">
            <Icon icon="ph:folder-open-bold" className="text-3xl text-muted" />
            <h3 className="text-sm font-bold text-text">{t("history.empty_title")}</h3>
            <p className="text-xs text-muted max-w-xs">{t("history.empty_desc")}</p>
            <Link
              to="/check/message"
              className="mt-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-bg shadow hover:bg-accent/90"
            >
              {t("landing.hero_check_message")}
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
