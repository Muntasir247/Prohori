import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RiskBadge } from "@/components/checks/RiskBadge";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";
import { checksApi } from "@/features/checks/api";
import type { CheckHistoryItem, TipItem } from "@/features/checks/types";

export default function CheckHome() {
  const { t, i18n } = useTranslation();
  const { data: user } = useSession();
  useSyncLanguage(user);

  const [recentChecks, setRecentChecks] = useState<CheckHistoryItem[]>([]);
  const [tip, setTip] = useState<TipItem | null>(null);
  const isBn = i18n.language === "bn";

  useEffect(() => {
    if (user) {
      checksApi.listChecks({ limit: 3 }).then((res) => setRecentChecks(res.items)).catch(() => {});
    }
    checksApi.getCurrentTip().then(setTip).catch(() => {});
  }, [user]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-xl mx-auto py-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {user ? t("check.greeting", { name: user.display_name }) : t("check.title")}
          </h1>
          <p className="text-sm text-muted">{t("check.home_subtitle")}</p>
        </header>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/check/message"
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-brand transition-colors group"
            data-testid="home-check-message"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand text-2xl group-hover:scale-105 transition-transform">
              <Icon icon="ph:chat-text-bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">{t("check.card_message_title")}</h2>
              <p className="text-xs text-muted mt-1">{t("check.card_message_desc")}</p>
            </div>
          </Link>

          <Link
            to="/check/payment"
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-brand transition-colors group"
            data-testid="home-check-payment"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand text-2xl group-hover:scale-105 transition-transform">
              <Icon icon="ph:paper-plane-tilt-bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">{t("check.card_payment_title")}</h2>
              <p className="text-xs text-muted mt-1">{t("check.card_payment_desc")}</p>
            </div>
          </Link>
        </div>

        {/* Urgent Row: I already sent money */}
        <div
          className="flex items-center justify-between rounded-xl border border-risk-high/40 bg-risk-high-tint/30 p-4 transition-colors"
          data-testid="urgent-already-sent-row"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-risk-high/20 p-2 text-risk-high">
              <Icon icon="ph:siren-bold" className="text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-risk-high">{t("check.already_sent_title")}</h3>
              <p className="text-xs text-muted">{t("check.already_sent_desc")}</p>
            </div>
          </div>
          <a
            href="tel:16247"
            className="text-xs font-bold text-risk-high bg-risk-high/15 px-3 py-1.5 rounded-lg hover:bg-risk-high/25 transition-colors"
          >
            {t("check.already_sent_action")}
          </a>
        </div>

        {/* Weekly Tip Card */}
        {tip && (
          <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
              <Icon icon="ph:lightbulb-bold" className="text-base" />
              <span>{t("check.weekly_tip_badge")}</span>
            </div>
            <h3 className="text-sm font-bold text-text">
              {isBn ? tip.title_bn : tip.title_en}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {isBn ? tip.body_bn : tip.body_en}
            </p>
          </section>
        )}

        {/* Recent Checks (Signed in) or Guest Prompt */}
        {user ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text">{t("check.recent_checks_title")}</h2>
              <Link to="/history" className="text-xs text-accent font-semibold hover:underline">
                {t("check.view_all_history")}
              </Link>
            </div>

            {recentChecks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recentChecks.map((item) => (
                  <Link
                    key={item.id}
                    to={`/history/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 hover:border-brand/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RiskBadge level={item.final_level} />
                      <div className="truncate text-xs text-text">
                        {item.masked_text || (item.amount_bdt ? `৳${item.amount_bdt}` : "Payment check")}
                      </div>
                    </div>
                    <span className="text-xs text-muted shrink-0 ml-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted">
                {t("check.empty_recent")}
              </p>
            )}
          </section>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-4 text-center text-xs text-muted">
            <span>{t("check.guest_history_hint")} </span>
            <Link to="/login" className="font-semibold text-accent hover:underline">
              {t("check.sign_in_link")}
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
