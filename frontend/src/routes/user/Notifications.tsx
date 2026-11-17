import { Icon } from "@iconify/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { LanternEmptyIllustration } from "@/components/brand/Illustrations";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";
import {
  type NotificationItem,
  useMarkNotificationsRead,
  useNotifications,
} from "@/features/notifications/api";
import { formatDate } from "@/lib/format";

function describeNotification(
  n: NotificationItem,
  isBn: boolean,
  t: (key: string, opts?: Record<string, string>) => string
): { icon: string; title: string; body: string } {
  if (n.type === "case_decided") {
    const ref = n.payload.reference || "";
    const status = n.payload.status || "reviewed";
    const statusLabel = t(`notifications.status_${status}`, { defaultValue: status });
    return {
      icon: "ph:gavel",
      title: t("notifications.case_decided_title", { reference: ref }),
      body: t("notifications.case_decided_body", { status: statusLabel }),
    };
  }
  if (n.type === "security_event") {
    return {
      icon: "ph:lock-key",
      title:
        (isBn ? n.payload.title_bn : n.payload.title_en) ||
        t("notifications.security_title"),
      body:
        (isBn ? n.payload.body_bn : n.payload.body_en) ||
        t("notifications.security_body"),
    };
  }
  return {
    icon: "ph:bell-ringing",
    title:
      (isBn ? n.payload.title_bn : n.payload.title_en) ||
      t("notifications.scam_alert_title"),
    body:
      (isBn ? n.payload.body_bn : n.payload.body_en) ||
      t("notifications.scam_alert_body"),
  };
}

/**
 * S23 Notifications (/notifications) — Doc 01 S23 & Doc 02 F22.
 * Polled in-app alert list with All / Unread Radix Tabs and Mark all read.
 */
export default function Notifications() {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language.startsWith("bn");
  const lang = isBn ? "bn" : "en";
  const { data: user, isLoading: sessionLoading } = useSession();
  useSyncLanguage(user);

  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data, isLoading, isError, refetch } = useNotifications(
    Boolean(user),
    tab === "unread"
  );
  const markRead = useMarkNotificationsRead();

  if (sessionLoading) {
    return (
      <AppShell>
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="skeleton h-8 w-44" />
          <div className="skeleton h-28 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-2xl font-bold text-text">
            {t("notifications.title")}
          </h1>
          <EmptyState
            illustration={<LanternEmptyIllustration />}
            title={t("notifications.guest_title")}
            description={t("notifications.guest_body")}
            action={
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
              >
                {t("auth.sign_in")}
              </Link>
            }
            testId="notifications-guest-prompt"
          />
        </div>
      </AppShell>
    );
  }

  const items = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-6" data-testid="notifications-page">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">
              {t("notifications.title")}
            </h1>
            <p className="mt-1 text-sm text-text-2">{t("notifications.subtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markRead.mutate({ all: true })}
              disabled={markRead.isPending}
              data-testid="mark-all-read-btn"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-3.5 text-xs font-semibold text-text transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              <Icon icon="ph:checks" className="text-base text-accent" aria-hidden />
              <span>{t("notifications.mark_all_read")}</span>
            </button>
          )}
        </header>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | "unread")}
          ariaLabel={t("notifications.title")}
          items={[
            {
              value: "all",
              label: t("notifications.tab_all"),
              testId: "notifications-tab-all",
            },
            {
              value: "unread",
              label: t("notifications.tab_unread"),
              badge: unreadCount,
              testId: "notifications-tab-unread",
            },
          ]}
        >
          <TabPanel value={tab} className="pt-5">
            {isLoading ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                <div className="skeleton h-20 w-full" />
                <div className="skeleton h-20 w-full" />
              </div>
            ) : isError ? (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-lg border border-risk-high/40 bg-risk-high-tint p-4 text-sm text-risk-high"
              >
                <span>{t("notifications.load_error")}</span>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-md border border-risk-high/40 px-3 py-1.5 text-xs font-semibold"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                illustration={<LanternEmptyIllustration />}
                title={t("notifications.empty_title")}
                description={t("notifications.empty_body")}
                action={
                  <Link
                    to="/check/message"
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-bone hover:bg-pine-hover"
                  >
                    {t("check.card_message_title")}
                  </Link>
                }
                testId="notifications-empty"
              />
            ) : (
              <ul className="flex flex-col gap-3" data-testid="notifications-list">
                {items.map((n) => {
                  const isUnread = n.read_at === null;
                  const meta = describeNotification(n, isBn, t);
                  return (
                    <li
                      key={n.id}
                      data-testid={`notification-item-${n.id}`}
                      className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors ${
                        isUnread
                          ? "border-border-strong bg-surface"
                          : "border-border bg-surface/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                            isUnread
                              ? "bg-pine text-accent"
                              : "bg-surface-2 text-text-2"
                          }`}
                        >
                          <Icon icon={meta.icon} className="text-lg" aria-hidden />
                        </span>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span
                                aria-label={t("notifications.unread_label")}
                                className="h-2 w-2 shrink-0 rounded-full bg-accent"
                              />
                            )}
                            <p className="text-sm font-semibold text-text">{meta.title}</p>
                          </div>
                          <p className="text-xs leading-relaxed text-text-2">{meta.body}</p>
                          <time className="font-mono text-[11px] text-faint">
                            {formatDate(n.created_at, lang)}
                          </time>
                        </div>
                      </div>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markRead.mutate({ ids: [n.id] })}
                          data-testid={`mark-read-${n.id}`}
                          className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                        >
                          {t("notifications.mark_read")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </TabPanel>
        </Tabs>
      </div>
    </AppShell>
  );
}
