import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { ReviewNav } from "@/components/review/ReviewNav";
import { analyticsApi } from "@/features/analytics/api";
import type { CampaignItem } from "@/features/analytics/types";
import { useSession } from "@/features/auth/useSession";
import { useDebounce } from "@/lib/useDebounce";

export default function Campaigns() {
  const { t, i18n } = useTranslation();
  const { data: user } = useSession();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSurgingFilter = searchParams.get("is_surging") === "true";
  const searchFilter = searchParams.get("search") || "";

  const [searchQuery, setSearchQuery] = useState(searchFilter);
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [targetMergeId, setTargetMergeId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync debounced search to URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (!debouncedSearch.trim()) {
      next.delete("search");
    } else {
      next.set("search", debouncedSearch.trim());
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  useEffect(() => {
    setSearchQuery(searchFilter);
  }, [searchFilter]);

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["campaigns", isSurgingFilter, debouncedSearch],
    queryFn: () =>
      analyticsApi.listCampaigns({
        is_surging: isSurgingFilter ? true : undefined,
        search: debouncedSearch,
      }),
    refetchInterval: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { label?: string; merge_into?: string } }) =>
      analyticsApi.updateCampaign(id, payload),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      void qc.invalidateQueries({ queryKey: ["analytics-overview"] });
      setSelectedCampaign(updated);
      setIsRenameOpen(false);
      setIsMergeOpen(false);
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Operation failed. Please try again.";
      setActionError(msg);
    },
  });

  const campaigns = useMemo(() => response?.items || [], [response?.items]);
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase().trim();
    return campaigns.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.scam_type_name || "").toLowerCase().includes(q) ||
        (c.scam_type_name_bn || "").toLowerCase().includes(q),
    );
  }, [campaigns, searchQuery]);

  if (!user) return null;

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === "false") next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const openRenameModal = (camp: CampaignItem) => {
    setSelectedCampaign(camp);
    setNewLabel(camp.label);
    setActionError(null);
    setIsRenameOpen(true);
  };

  const openMergeModal = (camp: CampaignItem) => {
    setSelectedCampaign(camp);
    setTargetMergeId("");
    setActionError(null);
    setIsMergeOpen(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !newLabel.trim()) return;
    updateMutation.mutate({
      id: selectedCampaign.id,
      payload: { label: newLabel.trim() },
    });
  };

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !targetMergeId) return;
    updateMutation.mutate({
      id: selectedCampaign.id,
      payload: { merge_into: targetMergeId },
    });
  };

  const otherCampaigns = filteredCampaigns.filter((c) => c.id !== selectedCampaign?.id);

  return (
    <AppShell wide>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">
            {t("review.campaigns_title", "Scam Campaigns & Clusters")}
          </h1>
          <p className="text-sm text-text-2">
            {t(
              "review.campaigns_subtitle",
              "Automated HDBSCAN clustering of semantic message embeddings into syndicate campaigns."
            )}
          </p>
        </header>

        <ReviewNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/80 p-3.5 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateParam("is_surging", isSurgingFilter ? "false" : "true")}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold transition-all ${
                isSurgingFilter
                  ? "border-risk-high/40 bg-risk-high/15 text-risk-high"
                  : "border-border/70 bg-surface-2 text-muted hover:bg-surface hover:text-text"
              }`}
            >
              <Icon icon="ph:trend-up" className="h-4 w-4 text-risk-high" />
              <span>Surging campaigns only</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon
                icon="ph:magnifying-glass"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none"
              />
              <input
                type="search"
                placeholder="Live search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-border/80 bg-surface-2/70 pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-faint focus:outline-none focus:border-brand font-mono transition-all"
              />
            </div>
            {(isSurgingFilter || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchParams(new URLSearchParams());
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Campaign Cards Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border/80 bg-surface/80 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Icon icon="ph:spinner-gap" className="h-5 w-5 animate-spin text-brand" />
              <span>Clustering and loading campaigns…</span>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
            <div className="mb-3 rounded-full bg-border/40 p-4 text-muted">
              <Icon icon="ph:users-three" className="h-8 w-8" />
            </div>
            <h3 className="font-display text-sm font-bold text-text">
              {t("review.no_campaigns", "Not enough reports to form a campaign yet.")}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted">
              {t(
                "review.no_campaigns_desc",
                "HDBSCAN requires at least 5 similar reported messages to form a verified campaign cluster."
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((camp) => (
              <div
                key={camp.id}
                onClick={() => setSelectedCampaign(camp)}
                className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-brand/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-text group-hover:text-brand transition-colors">
                      {camp.label}
                    </h3>
                    {camp.is_surging && (
                      <span className="inline-flex items-center gap-1 rounded bg-risk-high/15 border border-risk-high/25 px-2 py-0.5 text-2xs font-bold uppercase text-risk-high">
                        <Icon icon="ph:fire" className="h-3 w-3" />
                        <span>Surging</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Icon icon="ph:tag" className="h-3.5 w-3.5" />
                    <span>
                      {i18n.language === "bn"
                        ? camp.scam_type_name_bn || camp.scam_type_name || "General Scam"
                        : camp.scam_type_name || "General Scam"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-border/40 pt-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted">Total Cases:</span>
                      <div className="text-sm font-bold text-text">{camp.member_count}</div>
                    </div>
                    <div>
                      <span className="text-muted">7-Day Reports:</span>
                      <div
                        className={`text-sm font-bold ${
                          camp.is_surging
                            ? "text-risk-high"
                            : "text-text"
                        }`}
                      >
                        {camp.count_7d} (prev: {camp.prev_count_7d})
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-2xs text-muted">
                    <span>
                      Last seen:{" "}
                      {camp.last_seen_at
                        ? new Date(camp.last_seen_at).toLocaleDateString()
                        : "—"}
                    </span>
                    <span className="text-brand group-hover:underline">View cluster →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaign Detail Drawer (Doc 01 S28) */}
        {selectedCampaign && (
          <div
            role="dialog"
            aria-label="Campaign Details Drawer"
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-border bg-surface p-6 shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text">{selectedCampaign.label}</h3>
                  {selectedCampaign.is_surging && (
                    <span className="rounded bg-risk-high/15 border border-risk-high/25 px-2 py-0.5 text-2xs font-bold text-risk-high">
                      Surging
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-2 mt-0.5">
                  {i18n.language === "bn"
                    ? selectedCampaign.scam_type_name_bn || selectedCampaign.scam_type_name
                    : selectedCampaign.scam_type_name}{" "}
                  · {selectedCampaign.member_count} member cases
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                aria-label="Close drawer"
                className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-text"
              >
                <Icon icon="ph:x" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-6 text-sm">
              {/* Actions Header */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openRenameModal(selectedCampaign)}
                  className="flex-1 rounded-lg border border-border bg-bg/50 px-3 py-2 text-xs font-medium text-text hover:bg-bg"
                >
                  Rename Campaign
                </button>
                <button
                  type="button"
                  onClick={() => openMergeModal(selectedCampaign)}
                  className="flex-1 rounded-lg border border-border bg-bg/50 px-3 py-2 text-xs font-medium text-text hover:bg-bg"
                >
                  Merge into…
                </button>
              </div>

              {/* Representative Masked Messages */}
              <div className="space-y-3">
                <h4 className="text-xs text-muted font-semibold">
                  Representative Masked Messages ({selectedCampaign.sample_messages.length})
                </h4>
                {selectedCampaign.sample_messages.length === 0 ? (
                  <p className="text-sm text-text-2">No message samples available.</p>
                ) : (
                  selectedCampaign.sample_messages.map((msg, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-bg/40 p-3.5 text-xs text-text leading-relaxed font-mono select-text"
                    >
                      {msg}
                    </div>
                  ))
                )}
              </div>

              {/* Shared Risky Numbers */}
              <div className="space-y-3">
                <h4 className="text-xs text-muted font-semibold">
                  Shared Numbers in Cluster
                </h4>
                {selectedCampaign.shared_numbers.length === 0 ? (
                  <p className="text-sm text-text-2">No shared numbers linked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedCampaign.shared_numbers.map((num, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-text shadow-xs"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Case References */}
              <div className="space-y-3">
                <h4 className="text-xs text-muted font-semibold">
                  Recent Case References
                </h4>
                {selectedCampaign.case_references.length === 0 ? (
                  <p className="text-sm text-text-2">No case references found.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCampaign.case_references.map((ref, i) => (
                      <span
                        key={i}
                        className="rounded border border-border/80 bg-bg px-2 py-0.5 font-mono text-xs text-muted"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {isRenameOpen && selectedCampaign && (
          <div
            role="dialog"
            aria-modal="true"
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text">Rename Campaign</h3>
                  <p className="text-sm text-text-2 mt-0.5">Edit reviewer-assigned campaign label</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(false)}
                  className="rounded-lg p-1 text-muted hover:bg-bg hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="mt-5 flex flex-col gap-4 text-xs">
                {actionError && (
                  <div className="rounded-lg bg-risk-high/10 border border-risk-high/30 p-2.5 text-risk-high">
                    {actionError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="camp-label" className="font-medium text-text">
                    Campaign Label:
                  </label>
                  <input
                    id="camp-label"
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRenameOpen(false)}
                    className="rounded-lg border border-border bg-surface px-4 py-2 font-medium text-muted hover:bg-bg hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !newLabel.trim()}
                    className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent hover:bg-brand/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving…" : "Save Label"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Merge Modal */}
        {isMergeOpen && selectedCampaign && (
          <div
            role="dialog"
            aria-modal="true"
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text">Merge Campaign</h3>
                  <p className="text-sm text-text-2 mt-0.5">
                    Merge &ldquo;{selectedCampaign.label}&rdquo; into another campaign
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMergeOpen(false)}
                  className="rounded-lg p-1 text-muted hover:bg-bg hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleMergeSubmit} className="mt-5 flex flex-col gap-4 text-xs">
                {actionError && (
                  <div className="rounded-lg bg-risk-high/10 border border-risk-high/30 p-2.5 text-risk-high">
                    {actionError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="target-camp" className="font-medium text-text">
                    Target Campaign:
                  </label>
                  <select
                    id="target-camp"
                    required
                    value={targetMergeId}
                    onChange={(e) => setTargetMergeId(e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Select destination campaign…</option>
                    {otherCampaigns.map((oc) => (
                      <option key={oc.id} value={oc.id}>
                        {oc.label} ({oc.member_count} cases)
                      </option>
                    ))}
                  </select>
                  <span className="text-2xs text-muted">
                    All cases in this cluster will be migrated to the target campaign, and this
                    source campaign will be deleted.
                  </span>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMergeOpen(false)}
                    className="rounded-lg border border-border bg-surface px-4 py-2 font-medium text-muted hover:bg-bg hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !targetMergeId}
                    className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent hover:bg-brand/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Merging…" : "Merge Campaigns"}
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
