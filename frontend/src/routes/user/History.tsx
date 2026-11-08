import { Icon } from "@iconify/react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { RiskBadge } from "@/components/checks/RiskBadge";
import { useSession } from "@/features/auth/useSession";
import { checksApi } from "@/features/checks/api";
import type { CheckHistoryItem } from "@/features/checks/types";
import { formatAmount, toLocaleDigits } from "@/lib/format";

const LEVELS = ["", "High", "Medium", "Low"] as const;
const KINDS = ["", "message", "payment"] as const;

// S19 History (Doc 01). Reader column: search, two filter rows, then checks
// grouped by day. Rows show the risk word and icon, never colour alone.
export default function History() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "bn" ? "bn" : "en";
  const { data: user, isLoading: authLoading } = useSession();

  const [items, setItems] = useState<CheckHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setFailed(false);
    checksApi
      .listChecks({ level: levelFilter || undefined, kind: kindFilter || undefined, limit: 50 })
      .then((res) => setItems(res.items))
      .catch(() => {
        setItems([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [user, levelFilter, kindFilter]);

  useEffect(load, [load]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.masked_text || "").toLowerCase().includes(q) ||
        (item.amount_bdt ? String(item.amount_bdt).includes(q) : false) ||
        (item.scam_type ? item.scam_type.name.toLowerCase().includes(q) : false),
    );
  }, [items, searchQuery]);

  const groups = useMemo(() => groupByDay(filteredItems, lang, t), [filteredItems, lang, t]);

  const hasActiveFilters = Boolean(levelFilter || kindFilter || searchQuery.trim());
  const resetFilters = () => {
    setLevelFilter("");
    setKindFilter("");
    setSearchQuery("");
  };

  if (authLoading) {
    return (
      <AppShell>
        <HistorySkeleton />
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <header className="flex flex-col gap-2">
          <h1 className="text-text">{t("history.title")}</h1>
          <p className="text-base text-text-2">{t("history.subtitle")}</p>
        </header>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-pine text-bone">
            <Icon icon="ph:clock-counter-clockwise" className="text-2xl" aria-hidden />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold text-text">{t("history.guest_title")}</h2>
            <p className="mx-auto max-w-sm text-[15px] text-text-2">{t("history.guest_desc")}</p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-accent px-4 text-[15px] font-semibold text-on-accent transition-colors duration-[120ms] hover:bg-accent-hover"
            >
              {t("auth.sign_in")}
            </Link>
            <Link
              to="/check"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-border px-4 text-[15px] font-medium text-text transition-colors duration-[120ms] hover:border-border-strong hover:bg-surface-2"
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
      <header className="flex flex-col gap-2">
        <h1 className="text-text">{t("history.title")}</h1>
        <p className="text-base text-text-2">{t("history.subtitle")}</p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <label htmlFor="history-search" className="sr-only">
            {t("history.search_label")}
          </label>
          <Icon
            icon="ph:magnifying-glass"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-text-2"
            aria-hidden
          />
          <input
            id="history-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("history.search_placeholder")}
            className="min-h-12 w-full appearance-none rounded-md border border-border bg-surface py-3 pl-12 pr-12 text-base text-text placeholder:text-faint transition-colors duration-[120ms] hover:border-border-strong focus-visible:border-focus [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={t("history.clear_search")}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-2 transition-colors hover:text-text"
            >
              <Icon icon="ph:x-circle" className="text-xl" aria-hidden />
            </button>
          )}
        </div>

        <FilterRow
          label={t("history.filter_level")}
          value={levelFilter}
          onChange={setLevelFilter}
          options={LEVELS.map((lvl) => ({
            value: lvl,
            label: lvl ? t(`result.badge_${lvl.toLowerCase()}`) : t("history.filter_all"),
          }))}
        />
        <FilterRow
          label={t("history.filter_type")}
          value={kindFilter}
          onChange={setKindFilter}
          options={KINDS.map((k) => ({
            value: k,
            label: k ? t(`history.type_${k}`) : t("history.filter_all"),
          }))}
        />
      </div>

      <section aria-labelledby="history-results" className="flex flex-col gap-6">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <h2 id="history-results" className="text-sm font-medium text-text-2" aria-live="polite">
            {!loading &&
              !failed &&
              items.length > 0 &&
              t("history.showing", {
                shown: toLocaleDigits(filteredItems.length, lang),
                total: toLocaleDigits(items.length, lang),
              })}
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-brand hover:underline"
            >
              <Icon icon="ph:arrow-counter-clockwise" aria-hidden />
              {t("history.reset_filters")}
            </button>
          )}
        </div>

        {loading ? (
          <RowsSkeleton />
        ) : failed ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-10 text-center"
          >
            <Icon icon="ph:cloud-warning" className="text-[32px] text-text-2" aria-hidden />
            <p className="text-[15px] text-text-2">{t("history.load_error")}</p>
            <button
              type="button"
              onClick={load}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-[15px] font-medium text-text hover:border-border-strong hover:bg-surface-2"
            >
              {t("history.retry")}
            </button>
          </div>
        ) : groups.length > 0 ? (
          groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h3 className="px-1 text-sm font-semibold text-text-2">{group.label}</h3>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <HistoryRow item={item} lang={lang} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : items.length > 0 || hasActiveFilters ? (
          <EmptyState
            icon="ph:magnifying-glass"
            title={t("history.no_match_title")}
            desc={t("history.no_match_desc")}
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-[15px] font-medium text-text hover:border-border-strong hover:bg-surface-2"
              >
                {t("history.reset_filters")}
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="ph:clock-counter-clockwise"
            title={t("history.empty_title")}
            desc={t("history.empty_desc")}
            action={
              <Link
                to="/check/message"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-[15px] font-semibold text-on-accent transition-colors duration-[120ms] hover:bg-accent-hover"
              >
                {t("landing.hero_check_message")}
              </Link>
            }
          />
        )}
      </section>
    </AppShell>
  );
}

function HistoryRow({ item, lang }: { item: CheckHistoryItem; lang: "bn" | "en" }) {
  const { t } = useTranslation();
  const isPayment = item.kind === "payment";
  const title =
    item.masked_text ||
    (item.amount_bdt ? `৳${formatAmount(item.amount_bdt, lang)}` : t("history.payment_check"));
  const time = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(item.created_at));

  return (
    <Link
      to={`/history/${item.id}`}
      data-testid="history-item-row"
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-[120ms] hover:bg-surface-2 sm:gap-4"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2 group-hover:bg-surface-3"
      >
        <Icon icon={isPayment ? "ph:paper-plane-tilt" : "ph:chat-text"} className="text-xl" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-[15px] text-text">{title}</p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-text-2">
          <RiskBadge level={item.final_level} />
          {item.scam_type && <span className="truncate">{item.scam_type.name}</span>}
          {item.has_reported && (
            <span className="inline-flex items-center gap-1 text-success">
              <Icon icon="ph:flag" aria-hidden />
              {t("history.reported_tag")}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-start pt-0.5 text-sm tabular-nums text-text-2">
        <time dateTime={item.created_at}>{time}</time>
        <Icon
          icon="ph:caret-right"
          className="text-base transition-transform duration-[120ms] group-hover:translate-x-0.5 group-hover:text-text"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 text-sm font-medium text-text-2 sm:w-24">{label}</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-md border px-3.5 text-sm font-medium transition-colors duration-[120ms] ${
                active
                  ? "border-text bg-text text-bg"
                  : "border-border text-text-2 hover:border-border-strong hover:text-text"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: string;
  title: string;
  desc: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <Icon icon={icon} className="text-[32px] text-text-2" aria-hidden />
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mx-auto max-w-xs text-[15px] text-text-2">{desc}</p>
      </div>
      <div className="mt-1">{action}</div>
    </div>
  );
}

const shimmer =
  "animate-shimmer bg-gradient-to-r from-surface via-surface-2 to-surface bg-[length:200%_100%]";

function RowsSkeleton() {
  return (
    <ul aria-hidden className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3.5">
          <span className={`h-10 w-10 rounded-md ${shimmer}`} />
          <span className="flex flex-1 flex-col gap-2">
            <span className={`h-4 w-3/4 rounded-sm ${shimmer}`} />
            <span className={`h-5 w-24 rounded-sm ${shimmer}`} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className={`h-9 w-56 rounded-md ${shimmer}`} />
      <div className={`h-12 w-full rounded-md ${shimmer}`} />
      <RowsSkeleton />
    </div>
  );
}

/** Groups checks (already newest first) into Today, Yesterday, then dated days. */
function groupByDay(
  items: CheckHistoryItem[],
  lang: "bn" | "en",
  t: (key: string) => string,
): Array<{ key: string; label: string; items: CheckHistoryItem[] }> {
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  const fmtThisYear = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long" });
  const fmtOlder = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });

  const groups: Array<{ key: string; label: string; items: CheckHistoryItem[] }> = [];
  for (const item of items) {
    const d = new Date(item.created_at);
    const key = Number.isNaN(d.getTime()) ? "unknown" : dayKey(d);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label =
        key === dayKey(today)
          ? t("history.today")
          : key === dayKey(yesterday)
            ? t("history.yesterday")
            : key === "unknown"
              ? ""
              : (d.getFullYear() === today.getFullYear() ? fmtThisYear : fmtOlder).format(d);
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
