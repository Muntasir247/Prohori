import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { ReviewNav } from "@/components/review/ReviewNav";
import { analyticsApi } from "@/features/analytics/api";
import { useSession } from "@/features/auth/useSession";

// Lazy-loaded chart components to guarantee Recharts is NEVER bundled into public routes
const CasesByRiskChart = lazy(() => import("@/components/charts/CasesByRiskChart"));
const TopScamTypesChart = lazy(() => import("@/components/charts/TopScamTypesChart"));
const RepeatNumbersChart = lazy(() => import("@/components/charts/RepeatNumbersChart"));
const ReviewerDecisionsChart = lazy(() => import("@/components/charts/ReviewerDecisionsChart"));

function ChartFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon icon="ph:spinner" className="h-5 w-5 animate-spin text-brand" />
        <span>Loading chart…</span>
      </div>
    </div>
  );
}

export default function ReviewOverview() {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters directly from URL search params
  const range = searchParams.get("range") || "30d";
  const scamType = searchParams.get("scam_type") || "all";
  const riskLevel = searchParams.get("risk_level") || "all";
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";

  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  const {
    data: overview,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["analytics-overview", range, scamType, riskLevel, customFrom, customTo],
    queryFn: async () => {
      const res = await analyticsApi.getOverview({
        range: range === "custom" ? undefined : range,
        from: range === "custom" ? customFrom : undefined,
        to: range === "custom" ? customTo : undefined,
        scam_type: scamType,
        risk_level: riskLevel,
      });
      setLastUpdated(new Date());
      return res;
    },
    refetchInterval: 60_000, // Poll every 60 seconds
  });

  if (!user) return null;

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all" || !value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const setRangePreset = (preset: string) => {
    const next = new URLSearchParams(searchParams);
    if (preset === "30d") {
      next.delete("range");
    } else {
      next.set("range", preset);
    }
    if (preset !== "custom") {
      next.delete("from");
      next.delete("to");
    }
    setSearchParams(next);
  };

  const kpis = overview?.kpis;
  const surgingCampaigns = overview?.surging_campaigns || [];

  return (
    <AppShell wide>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">
            {t("review.overview_title", "Reviewer Analytics & Overview")}
          </h1>
          <p className="text-sm text-text-2">
            {t("review.overview_subtitle", "Live queue pressure, risk series, recurring numbers, and scam intelligence.")}
          </p>
        </header>

        <ReviewNav
          lastUpdated={lastUpdated}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />

        {/* Campaign Radar Alert Banner (Doc 01 S24, F36) */}
        {surgingCampaigns.length > 0 && (
          <div
            data-testid="campaign-radar-banner"
            className="flex flex-col gap-2 rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 text-sm text-risk-high"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold">
                <Icon icon="ph:warning-circle" className="h-5 w-5 text-risk-high" />
                <span>Campaign Radar: {surgingCampaigns.length} Surging Campaign{surgingCampaigns.length > 1 ? "s" : ""}</span>
              </div>
              <Link
                to="/review/campaigns?is_surging=true"
                className="inline-flex items-center gap-1 font-medium text-risk-high hover:underline"
              >
                <span>View campaigns</span>
                <Icon icon="ph:arrow-right" className="h-4 w-4" />
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2 text-xs">
              {surgingCampaigns.map((camp) => (
                <li
                  key={camp.id}
                  className="rounded-md border border-risk-high/20 bg-surface/80 px-2.5 py-1 text-text shadow-sm"
                >
                  <span className="font-semibold">{camp.label}</span>: {camp.count_7d} reports in 7d (previously {camp.prev_count_7d})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filter Bar (Dates, Scam Type, Risk Level) */}
        <section
          aria-label="Analytics Filters"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted">{t("review.range", "Time Range")}:</span>
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setRangePreset(p)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  range === p
                    ? "bg-accent text-on-accent shadow-sm"
                    : "border border-border bg-surface text-muted hover:bg-bg hover:text-text"
                }`}
              >
                {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRangePreset("custom")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                range === "custom"
                  ? "bg-accent text-on-accent shadow-sm"
                  : "border border-border bg-surface text-muted hover:bg-bg hover:text-text"
              }`}
            >
              Custom
            </button>

            {range === "custom" && (
              <div className="flex items-center gap-1.5 pl-2">
                <input
                  type="date"
                  aria-label="From date"
                  value={customFrom}
                  onChange={(e) => updateFilter("from", e.target.value)}
                  className="rounded border border-border bg-bg px-2 py-0.5 text-xs text-text"
                />
                <span className="text-muted">to</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={customTo}
                  onChange={(e) => updateFilter("to", e.target.value)}
                  className="rounded border border-border bg-bg px-2 py-0.5 text-xs text-text"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-risk" className="font-medium text-muted">
                {t("review.risk", "Risk")}:
              </label>
              <select
                id="filter-risk"
                value={riskLevel}
                onChange={(e) => updateFilter("risk_level", e.target.value)}
                className="rounded-lg border border-border bg-bg px-2.5 py-1 text-xs text-text"
              >
                <option value="all">All levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-scam-type" className="font-medium text-muted">
                {t("review.scam_type", "Type")}:
              </label>
              <select
                id="filter-scam-type"
                value={scamType}
                onChange={(e) => updateFilter("scam_type", e.target.value)}
                className="rounded-lg border border-border bg-bg px-2.5 py-1 text-xs text-text"
              >
                <option value="all">All types</option>
                <option value="fake_wallet_staff">Fake Wallet Staff</option>
                <option value="lottery_prize">Lottery Prize</option>
                <option value="account_takeover">Account Takeover</option>
                <option value="fake_job_offer">Fake Job Offer</option>
                <option value="emergency_impersonation">Emergency Impersonation</option>
              </select>
            </div>

            {(range !== "30d" || scamType !== "all" || riskLevel !== "all") && (
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="text-xs text-brand hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </section>

        {/* 4 Stat Cards / KPIs (Doc 01 S24) */}
        <section aria-label="Reviewer KPIs" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* 1. Open cases */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{t("review.kpi_open_cases", "Open Cases")}</span>
              <Icon icon="ph:folder-open" className="h-4 w-4 text-info" />
            </div>
            <div className="text-2xl font-bold text-text">
              {isLoading ? "—" : kpis?.open_cases ?? 0}
            </div>
            <span className="text-xs text-muted">Awaiting reviewer decision</span>
          </div>

          {/* 2. High today */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{t("review.kpi_high_today", "High Risk Today")}</span>
              <Icon icon="ph:warning" className="h-4 w-4 text-risk-high" />
            </div>
            <div className="text-2xl font-bold text-risk-high">
              {isLoading ? "—" : kpis?.high_today ?? 0}
            </div>
            <span className="text-xs text-muted">Flagged by rules & fusion</span>
          </div>

          {/* 3. Median time to decision */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{t("review.kpi_median_time", "Median Decision Time")}</span>
              <Icon icon="ph:clock" className="h-4 w-4 text-warning" />
            </div>
            <div className="text-2xl font-bold text-text">
              {isLoading ? "—" : `${kpis?.median_time_to_decision ?? 0}m`}
            </div>
            <span className="text-xs text-muted">From report to outcome</span>
          </div>

          {/* 4. Reviewer agreement */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">{t("review.kpi_agreement", "Reviewer Agreement")}</span>
              <Icon icon="ph:handshake" className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-success">
              {isLoading ? "—" : `${Math.round((kpis?.reviewer_agreement ?? 0) * 100)}%`}
            </div>
            <span className="text-xs text-muted">Alignment with Prohori score</span>
          </div>
        </section>

        {/* 4 Charts Grid */}
        <section aria-label="Review Charts" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Cases by Risk Level Over Time (Stacked Bar) */}
          <Suspense fallback={<ChartFallback />}>
            <CasesByRiskChart
              data={overview?.cases_by_risk || []}
              simulated={overview?.simulated ?? true}
            />
          </Suspense>

          {/* Chart 2: Top Scam Types (Horizontal/Vertical Bar) */}
          <Suspense fallback={<ChartFallback />}>
            <TopScamTypesChart
              data={overview?.top_scam_types || []}
              simulated={overview?.simulated ?? true}
            />
          </Suspense>

          {/* Chart 3: Repeated Risky Numbers Over Time (Line) */}
          <Suspense fallback={<ChartFallback />}>
            <RepeatNumbersChart
              data={overview?.repeat_numbers || []}
              simulated={overview?.simulated ?? true}
            />
          </Suspense>

          {/* Chart 4: Reviewer Decisions Over Time (Stacked Bar) */}
          <Suspense fallback={<ChartFallback />}>
            <ReviewerDecisionsChart
              data={overview?.reviewer_decisions || []}
              simulated={overview?.simulated ?? true}
            />
          </Suspense>
        </section>
      </div>
    </AppShell>
  );
}
