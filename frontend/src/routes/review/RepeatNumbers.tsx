import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { ReviewNav } from "@/components/review/ReviewNav";
import { analyticsApi } from "@/features/analytics/api";
import type { RepeatNumberItem } from "@/features/analytics/types";
import { useSession } from "@/features/auth/useSession";

const SparklineChart = lazy(() => import("@/components/charts/SparklineChart"));

export default function RepeatNumbers() {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get("status") || "all";
  const searchFilter = searchParams.get("search") || "";

  const [selectedNumber, setSelectedNumber] = useState<RepeatNumberItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<"watch" | "confirmed_risky" | "cleared">("watch");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["repeat-numbers", statusFilter, searchFilter],
    queryFn: () =>
      analyticsApi.listRepeatNumbers({
        status: statusFilter,
        search: searchFilter,
      }),
    refetchInterval: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "watch" | "confirmed_risky" | "cleared";
      reason: string;
    }) => analyticsApi.updateNumberStatus(id, { status, reason }),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ["repeat-numbers"] });
      void qc.invalidateQueries({ queryKey: ["analytics-overview"] });
      setSelectedNumber(updated);
      setIsModalOpen(false);
      setReason("");
      setFormError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update status. Ensure reason has at least 10 characters.";
      setFormError(msg);
    },
  });

  if (!user) return null;

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === "all") next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const openStatusModal = (item: RepeatNumberItem) => {
    setSelectedNumber(item);
    setNewStatus(item.status);
    setReason("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNumber) return;
    if (reason.trim().length < 10) {
      setFormError("Reason must be at least 10 characters long.");
      return;
    }
    updateMutation.mutate({
      id: selectedNumber.id,
      status: newStatus,
      reason: reason.trim(),
    });
  };

  const items = response?.items || [];

  return (
    <AppShell wide>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {t("review.repeat_numbers_screen_title", "Repeated Risky Numbers")}
          </h1>
          <p className="text-sm text-muted">
            {t(
              "review.repeat_numbers_screen_subtitle",
              "Phone numbers recurring across multiple user checks and reported cases."
            )}
          </p>
        </header>

        <ReviewNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted">Status:</span>
            {(["all", "watch", "confirmed_risky", "cleared"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateParam("status", s)}
                className={`rounded-lg px-2.5 py-1 font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-brand text-white shadow-sm"
                    : "border border-border bg-surface text-muted hover:bg-bg hover:text-text"
                }`}
              >
                {s === "all" ? "All statuses" : s.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon
                icon="ph:magnifying-glass"
                className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted"
              />
              <input
                type="text"
                placeholder="Search masked number…"
                value={searchFilter}
                onChange={(e) => updateParam("search", e.target.value)}
                className="rounded-lg border border-border bg-bg pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            {(statusFilter !== "all" || searchFilter) && (
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="text-xs text-brand hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Numbers Table */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bg/50 text-muted font-medium">
                <tr>
                  <th className="py-3 px-4">Masked Number</th>
                  <th className="py-3 px-4 text-center">Reports</th>
                  <th className="py-3 px-4 text-center">Total Checks</th>
                  <th className="py-3 px-4 text-center">High Share</th>
                  <th className="py-3 px-4">First Seen</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Icon icon="ph:spinner" className="h-4 w-4 animate-spin text-brand" />
                        <span>Loading repeat numbers…</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted">
                      No repeat numbers found matching current filters.
                    </td>
                  </tr>
                ) : (
                  items.map((num) => (
                    <tr
                      key={num.id}
                      onClick={() => setSelectedNumber(num)}
                      className={`cursor-pointer transition-colors hover:bg-bg/60 ${
                        selectedNumber?.id === num.id ? "bg-brand/5" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-text">
                        {num.masked_display}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        <span className="rounded bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-400 font-bold">
                          {num.report_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{num.check_count}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-medium ${
                            num.high_share >= 0.5
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-muted"
                          }`}
                        >
                          {Math.round(num.high_share * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {num.first_seen_at ? new Date(num.first_seen_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {num.last_seen_at ? new Date(num.last_seen_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider ${
                            num.status === "confirmed_risky"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20"
                              : num.status === "cleared"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {num.status === "confirmed_risky"
                            ? "Confirmed"
                            : num.status === "cleared"
                            ? "Cleared"
                            : "Watch"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStatusModal(num);
                          }}
                          className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text hover:bg-bg transition-colors"
                        >
                          Change status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Drawer for Selected Number (Doc 01 S27) */}
        {selectedNumber && (
          <div
            role="dialog"
            aria-label="Number Details Drawer"
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-surface p-6 shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-text">Number Details</h3>
                <p className="font-mono text-sm text-brand">{selectedNumber.masked_display}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNumber(null)}
                aria-label="Close drawer"
                className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-text"
              >
                <Icon icon="ph:x" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-6 text-sm">
              {/* Status and Action */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-bg/40 p-4">
                <div>
                  <div className="text-xs text-muted">Current Status</div>
                  <div className="mt-1 font-semibold capitalize text-text">
                    {selectedNumber.status.replace("_", " ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openStatusModal(selectedNumber)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand/90"
                >
                  Change Status
                </button>
              </div>

              {/* 30-Day Activity Sparkline */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">30-Day Checks Activity</span>
                  <span className="text-xs font-semibold text-text">
                    {selectedNumber.sparkline_30d.reduce((acc, p) => acc + p.count, 0)} total
                  </span>
                </div>
                <Suspense
                  fallback={
                    <div className="h-16 flex items-center justify-center text-xs text-muted">
                      Loading activity…
                    </div>
                  }
                >
                  <SparklineChart data={selectedNumber.sparkline_30d} />
                </Suspense>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border bg-bg/50 p-3">
                  <div className="text-muted">Report Count</div>
                  <div className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                    {selectedNumber.report_count}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-bg/50 p-3">
                  <div className="text-muted">Total Checks</div>
                  <div className="mt-1 text-lg font-bold text-text">
                    {selectedNumber.check_count}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-bg/50 p-3">
                  <div className="text-muted">High Risk Checks</div>
                  <div className="mt-1 text-lg font-bold text-amber-500">
                    {selectedNumber.high_count}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-bg/50 p-3">
                  <div className="text-muted">High Risk Share</div>
                  <div className="mt-1 text-lg font-bold text-text">
                    {Math.round(selectedNumber.high_share * 100)}%
                  </div>
                </div>
              </div>

              {/* Timeline info */}
              <div className="space-y-2 rounded-xl border border-border bg-bg/30 p-4 text-xs text-muted">
                <div className="flex justify-between">
                  <span>First reported / seen:</span>
                  <span className="font-mono text-text">
                    {selectedNumber.first_seen_at
                      ? new Date(selectedNumber.first_seen_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last active check:</span>
                  <span className="font-mono text-text">
                    {selectedNumber.last_seen_at
                      ? new Date(selectedNumber.last_seen_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Change Modal (Requires reason + audit) */}
        {isModalOpen && selectedNumber && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            data-testid="status-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 id="status-modal-title" className="text-lg font-bold text-text">
                    Update Number Status
                  </h3>
                  <p className="font-mono text-xs text-brand mt-0.5">
                    {selectedNumber.masked_display}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-muted hover:bg-bg hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleStatusSubmit} className="mt-5 flex flex-col gap-4 text-xs">
                {formError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-600 dark:text-rose-400">
                    {formError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-status" className="font-medium text-text">
                    New Status:
                  </label>
                  <select
                    id="new-status"
                    value={newStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setNewStatus(e.target.value as "watch" | "confirmed_risky" | "cleared")
                    }
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="watch">Watch (Monitored)</option>
                    <option value="confirmed_risky">Confirmed Risky (Rules Trigger High)</option>
                    <option value="cleared">Cleared (Legitimate / Whitelisted)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="status-reason" className="font-medium text-text">
                    Audit Reason (required, minimum 10 characters):
                  </label>
                  <textarea
                    id="status-reason"
                    rows={3}
                    placeholder="Document justification for status change..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="rounded-lg border border-border bg-bg p-2.5 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <span className="text-2xs text-muted">
                    This change and reason will be permanently recorded in the reviewer audit log.
                  </span>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-border bg-surface px-4 py-2 font-medium text-muted hover:bg-bg hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || reason.trim().length < 10}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Icon icon="ph:spinner" className="h-4 w-4 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <span>Save status</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
