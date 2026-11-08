import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RiskBadge } from "@/components/checks/RiskBadge";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";
import { checksApi } from "@/features/checks/api";
import type { CheckHistoryItem, TipItem } from "@/features/checks/types";
import { formatAmount } from "@/lib/format";

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

  const actions = [
    {
      to: "/check/message",
      testid: "home-check-message",
      icon: "ph:chat-text",
      title: t("check.card_message_title"),
      desc: t("check.card_message_desc"),
    },
    {
      to: "/check/payment",
      testid: "home-check-payment",
      icon: "ph:paper-plane-tilt",
      title: t("check.card_payment_title"),
      desc: t("check.card_payment_desc"),
    },
  ];

  return (
    <AppShell>
      <header className="flex flex-col gap-2">
        <h1 className="text-text">
          {user ? t("check.greeting", { name: user.display_name }) : t("check.title")}
        </h1>
        <p className="max-w-prose text-base text-text-2">{t("check.home_subtitle")}</p>
      </header>

      {/* Two action cards (Doc 01 S09) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            data-testid={a.testid}
            className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors duration-[120ms] hover:border-border-strong hover:bg-surface-2 active:translate-y-px sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-pine text-bone">
                <Icon icon={a.icon} className="text-2xl" aria-hidden />
              </span>
              <Icon
                icon="ph:arrow-right"
                className="text-xl text-text-2 transition-transform duration-[120ms] group-hover:translate-x-0.5 group-hover:text-text"
                aria-hidden
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-snug text-text">{a.title}</h2>
              <p className="mt-1 text-[15px] text-text-2">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Already sent money */}
      <section
        className="flex flex-col gap-4 rounded-lg border border-risk-high/40 bg-risk-high-tint p-5"
        data-testid="urgent-already-sent-row"
      >
        <div className="flex items-start gap-3">
          <Icon icon="ph:siren" className="mt-0.5 shrink-0 text-2xl text-risk-high" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-text">{t("check.already_sent_title")}</h2>
            <p className="mt-0.5 text-[15px] text-text-2">{t("check.already_sent_desc")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 pl-9 sm:flex-row sm:items-center">
          <a
            href="tel:16247"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-[15px] font-medium text-text transition-colors duration-[120ms] hover:bg-surface-2"
          >
            <Icon icon="ph:phone-call" className="text-lg" aria-hidden />
            <span>
              bKash <span className="font-mono">16247</span>
            </span>
          </a>
          <Link
            to="/already-sent"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-[15px] font-semibold text-risk-high hover:underline"
          >
            {t("check.already_sent_action")}
            <Icon icon="ph:arrow-right" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Weekly tip */}
      {tip && (
        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-2">
            <Icon icon="ph:lightbulb" className="text-lg" aria-hidden />
            {t("check.weekly_tip_badge")}
          </p>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-text">
            {isBn ? tip.title_bn : tip.title_en}
          </h2>
          <p className="mt-1 text-[15px] text-text-2">{isBn ? tip.body_bn : tip.body_en}</p>
        </section>
      )}

      {/* Recent checks (signed in) or guest hint */}
      {user ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">{t("check.recent_checks_title")}</h2>
            <Link
              to="/history"
              className="inline-flex min-h-11 items-center text-[15px] font-medium text-brand hover:underline"
            >
              {t("check.view_all_history")}
            </Link>
          </div>

          {recentChecks.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {recentChecks.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/history/${item.id}`}
                    className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-3 transition-colors duration-[120ms] hover:bg-surface-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <RiskBadge level={item.final_level} />
                      <span className="truncate text-[15px] text-text">
                        {item.masked_text ||
                          (item.amount_bdt
                            ? `৳${formatAmount(item.amount_bdt, isBn ? "bn" : "en")}`
                            : t("history.payment_check"))}
                      </span>
                    </div>
                    <time dateTime={item.created_at} className="shrink-0 text-sm tabular-nums text-text-2">
                      {new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-GB", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(item.created_at))}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
              <Icon icon="ph:clock-counter-clockwise" className="text-[32px] text-text-2" aria-hidden />
              <p className="text-[15px] text-text-2">{t("check.empty_recent")}</p>
              <Link
                to="/check/message"
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-[15px] font-medium text-text hover:border-border-strong hover:bg-surface-2"
              >
                {t("check.card_message_title")}
              </Link>
            </div>
          )}
        </section>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border px-4 py-3 text-[15px] text-text-2">
          <Icon icon="ph:clock-counter-clockwise" className="text-lg" aria-hidden />
          <span>{t("check.guest_history_hint")}</span>
          <Link to="/login" className="font-semibold text-brand hover:underline">
            {t("check.sign_in_link")}
          </Link>
        </p>
      )}
    </AppShell>
  );
}
