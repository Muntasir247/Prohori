import { Icon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ReviewNav } from "@/components/review/ReviewNav";
import { RiskBadge } from "@/components/checks/RiskBadge";
import { casesApi } from "@/features/cases/api";
import type { CaseSummary } from "@/features/cases/types";
import { useDebounce } from "@/lib/useDebounce";

export default function CaseQueue() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBn = i18n.language === "bn";

  const statusFilter = searchParams.get("status") || "all";
  const levelFilter = searchParams.get("level") || "all";
  const queryParam = searchParams.get("q") || "";

  // Local live search query for 0-latency typing
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const debouncedQuery = useDebounce(searchQuery, 250);

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Sync debounced search to URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (!debouncedQuery.trim()) {
      next.delete("q");
    } else {
      next.set("q", debouncedQuery.trim());
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedQuery, searchParams, setSearchParams]);

  // Keep local search input synced if URL changed externally
  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  const fetchCases = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await casesApi.listCases({
        status: statusFilter,
        level: levelFilter,
        q: debouncedQuery || undefined,
        page_size: 50,
      });
      setCases(res.items || []);
      setTotal(res.total || 0);
      setLastUpdated(new Date());
    } catch {
      setCases([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [statusFilter, levelFilter, debouncedQuery]);

  useEffect(() => {
    void fetchCases();
  }, [fetchCases]);

  // Instant in-memory live filter while typing
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase().trim();
    return cases.filter((c) => {
      const refMatch = c.reference.toLowerCase().includes(q);
      const textMatch = (c.masked_preview || "").toLowerCase().includes(q);
      const scamMatch =
        c.scam_type &&
        ((c.scam_type.name_bn || "").toLowerCase().includes(q) ||
          (c.scam_type.name_en || "").toLowerCase().includes(q));
      return refMatch || textMatch || scamMatch;
    });
  }, [cases, searchQuery]);

  // Keyboard navigation: J (down), K (up), Enter (open), R (refresh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCases.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredCases[selectedIndex]) {
        e.preventDefault();
        navigate(`/review/cases/${filteredCases[selectedIndex].id}`);
      } else if (e.key === "r") {
        e.preventDefault();
        void fetchCases();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCases, selectedIndex, navigate, fetchCases]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all" || !value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: "bg-brand/15 text-brand border-brand/30",
      in_review: "bg-warning/15 text-warning border-warning/30",
      confirmed_scam: "bg-risk-high/15 text-risk-high border-risk-high/30",
      not_scam: "bg-success/15 text-success border-success/30",
      escalated: "bg-info/15 text-info border-info/30",
      closed: "bg-surface-2 text-muted border-border",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-mono font-bold uppercase tracking-wider ${
          styles[status] || "bg-surface-2 text-muted border-border"
        }`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <AppShell wide>
      <div className="flex flex-col gap-6 py-2 w-full">
        {/* Navigation & Header */}
        <ReviewNav lastUpdated={lastUpdated} isFetching={isFetching} onRefresh={fetchCases} />

        {/* Title & Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text">
              {isBn ? "প্রতারণা অভিযোগ কিউ" : "Fraud Incident Review Queue"}
            </h1>
            <p className="text-sm text-text-2 mt-1 leading-relaxed">
              {isBn
                ? `মোট ${total} টি কেস পর্যালোচনা তালিকায় রয়েছে। কীবোর্ড শর্টকাট: J (নিচে), K (উপরে), Enter (ওপেন), R (রিফ্রেশ)`
                : `Showing ${filteredCases.length} of ${total} cases. Shortcuts: J (next), K (prev), Enter (open), R (refresh)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs bg-surface-2 border border-border/80 px-3 py-1.5 rounded-xl text-muted">
              {isBn ? "সক্রিয় কেস" : "Active Pool"}: <strong className="text-brand font-bold">{total}</strong>
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-2xl border border-border/80 bg-surface/80 p-3.5 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
            {/* Status Segmented Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {["all", "new", "in_review", "confirmed_scam", "not_scam"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateFilter("status", st)}
                  className={`px-3 py-1.5 rounded-xl text-2xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? "bg-accent text-on-accent"
                      : "text-muted hover:text-text hover:bg-surface-2/60"
                  }`}
                >
                  {st === "all" ? (isBn ? "সকল কেস" : "All Cases") : st.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>

            {/* Risk Level Filter & Search */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={levelFilter}
                onChange={(e) => updateFilter("level", e.target.value)}
                className="rounded-xl border border-border/80 bg-surface-2 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="all">{isBn ? "সকল ঝুঁকির মাত্রা" : "All Risk Levels"}</option>
                <option value="High">{isBn ? "উচ্চ ঝুঁকি (High)" : "High Risk"}</option>
                <option value="Medium">{isBn ? "মাঝারি ঝুঁকি (Medium)" : "Medium Risk"}</option>
                <option value="Low">{isBn ? "কম ঝুঁকি (Low)" : "Low Risk"}</option>
              </select>

              <div className="relative flex-1 md:w-64">
                <Icon
                  icon="ph:magnifying-glass"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isBn ? "রেফারেন্স বা মেসেজ খুঁজুন..." : "Live search ref or text..."}
                  className="w-full rounded-xl border border-border/80 bg-surface-2/70 pl-8 pr-8 py-1.5 text-xs text-text placeholder:text-faint focus:outline-none focus:border-brand font-mono transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    title="Clear search"
                  >
                    <Icon icon="ph:x-circle" className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Case Queue Table */}
        <div className="rounded-2xl border border-border/80 bg-surface/90 overflow-hidden relative shadow-lg">
          {/* Subtle fetching progress bar */}
          {isFetching && (
            <div
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent z-10"
            />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2/70 text-muted text-2xs font-semibold">
                  <th className="py-3 px-4 font-semibold">{isBn ? "রেফারেন্স" : "Reference"}</th>
                  <th className="py-3 px-4 font-semibold">{isBn ? "ঝুঁকি" : "Risk"}</th>
                  <th className="py-3 px-4 font-semibold">{isBn ? "বার্তা সারাংশ" : "Masked Message Preview"}</th>
                  <th className="py-3 px-4 font-semibold">{isBn ? "ক্যাটাগরি" : "Scam Type"}</th>
                  <th className="py-3 px-4 font-semibold">{isBn ? "স্ট্যাটাস" : "Status"}</th>
                  <th className="py-3 px-4 font-semibold">{isBn ? "তারিখ" : "Reported At"}</th>
                  <th className="py-3 px-4 text-right font-semibold">{isBn ? "অ্যাকশন" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Icon icon="ph:spinner-gap" className="animate-spin text-lg text-brand" />
                        <span>{isBn ? "কেস তালিকা লোড হচ্ছে..." : "Loading case queue..."}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="ph:tray" className="text-3xl text-faint" />
                        <p>{isBn ? "কোনো কেস পাওয়া যায়নি।" : "No cases match the current filter."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/review/cases/${c.id}`)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-brand/10 border-l-2 border-l-brand"
                            : "hover:bg-surface-2/60"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-text">
                          <Link
                            to={`/review/cases/${c.id}`}
                            className="hover:text-brand hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.reference}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <RiskBadge level={c.final_level} />
                        </td>
                        <td className="py-3 px-4 max-w-xs sm:max-w-md truncate text-text/90 font-mono">
                          {c.masked_preview || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted whitespace-nowrap">
                          {c.scam_type ? (isBn ? c.scam_type.name_bn : c.scam_type.name_en) : "Unclassified"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/review/cases/${c.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{isBn ? "পর্যালোচনা" : "Review"}</span>
                            <Icon icon="ph:arrow-right" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
