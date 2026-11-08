import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppShell } from "@/components/AppShell";
import { adminApi, SafeActionAdmin } from "@/features/admin/api";

export default function AdminSafeActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<SafeActionAdmin | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formLabelEn, setFormLabelEn] = useState("");
  const [formLabelBn, setFormLabelBn] = useState("");
  const [formBodyEn, setFormBodyEn] = useState("");
  const [formBodyBn, setFormBodyBn] = useState("");
  const [formContext, setFormContext] = useState<"before_payment" | "after_payment" | "both">("before_payment");
  const [formMinLevel, setFormMinLevel] = useState<"Low" | "Medium" | "High">("Low");
  const [formProvider, setFormProvider] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSourceUrl, setFormSourceUrl] = useState("");
  const [formVerifiedAt, setFormVerifiedAt] = useState("");
  const [formIsActive, setFormIsActive] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState(100);

  const {
    data: actions = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-safe-actions"],
    queryFn: () => adminApi.listSafeActions(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);

      // Frontend safety check: phone requires source_url and verified_at to be active
      if (formPhone.trim() && formIsActive) {
        if (!formSourceUrl.trim() || !formVerifiedAt.trim()) {
          throw new Error(
            "A helpline with a phone number cannot be active without a verified source URL and verification date.",
          );
        }
      }

      const payload = {
        label_en: formLabelEn,
        label_bn: formLabelBn,
        body_en: formBodyEn || undefined,
        body_bn: formBodyBn || undefined,
        context: formContext,
        min_level: formMinLevel,
        provider: formProvider || undefined,
        phone: formPhone || undefined,
        source_url: formSourceUrl || undefined,
        verified_at: formVerifiedAt || undefined,
        is_active: formIsActive,
        sort_order: formSortOrder,
      };

      if (editingAction) {
        return adminApi.updateSafeAction(editingAction.id, payload);
      } else {
        return adminApi.createSafeAction({
          id: formId.trim().toLowerCase(),
          ...payload,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-safe-actions"] });
      closeModal();
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to save safe action");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSafeAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-safe-actions"] });
    },
    onError: (err: Error) => {
      alert(`Delete failed: ${err.message}`);
    },
  });

  const openCreateModal = () => {
    setEditingAction(null);
    setFormId("");
    setFormLabelEn("");
    setFormLabelBn("");
    setFormBodyEn("");
    setFormBodyBn("");
    setFormContext("before_payment");
    setFormMinLevel("Low");
    setFormProvider("");
    setFormPhone("");
    setFormSourceUrl("");
    setFormVerifiedAt("");
    setFormIsActive(false);
    setFormSortOrder(100);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (action: SafeActionAdmin) => {
    setEditingAction(action);
    setFormId(action.id);
    setFormLabelEn(action.label_en);
    setFormLabelBn(action.label_bn);
    setFormBodyEn(action.body_en || "");
    setFormBodyBn(action.body_bn || "");
    setFormContext(action.context);
    setFormMinLevel(action.min_level);
    setFormProvider(action.provider || "");
    setFormPhone(action.phone || "");
    setFormSourceUrl(action.source_url || "");
    setFormVerifiedAt(action.verified_at || "");
    setFormIsActive(action.is_active);
    setFormSortOrder(action.sort_order);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAction(null);
    setFormError(null);
  };

  const unverifiedHelplines = actions.filter((a) => a.needs_reverification);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <AdminNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* Title & Action Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {t("admin.safe_actions_title", "Safe Actions & Helplines (S31)")}
            </h1>
            <p className="text-sm text-muted">
              {t(
                "admin.safe_actions_subtitle",
                "Control the verified next steps presented to users. Helplines cannot activate without source verification.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover transition-colors"
          >
            <Icon icon="ph:plus-bold" className="h-4 w-4" />
            <span>{t("admin.new_safe_action", "New Safe Action")}</span>
          </button>
        </div>

        {/* 90-day verification alert banner */}
        {unverifiedHelplines.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            <Icon icon="ph:warning" className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
            <div className="flex-1">
              <span className="font-semibold">Re-verification Required:</span>{" "}
              {unverifiedHelplines.length} helpline(s) have not been re-verified within the last 90 days.
              Verify on the provider's official site to maintain safety integrity.
              <ul className="mt-1 list-disc list-inside text-xs opacity-90">
                {unverifiedHelplines.map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.label_en}</span> (Phone: {a.phone || "none"}, Last verified: {a.verified_at || "never"})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted">
              <Icon icon="ph:spinner" className="h-5 w-5 animate-spin text-brand" />
              <span>Loading safe actions…</span>
            </div>
          ) : actions.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No safe actions configured. Click "New Safe Action" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text">
                <thead className="border-b border-border bg-background/50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">ID & Provider</th>
                    <th className="px-4 py-3">English Label</th>
                    <th className="px-4 py-3">Bangla Label</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Min Level</th>
                    <th className="px-4 py-3">Verified Date</th>
                    <th className="px-4 py-3">Source URL</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {actions.map((act) => (
                    <tr key={act.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-brand">
                        <div>{act.id}</div>
                        {act.provider && (
                          <span className="inline-block rounded bg-background px-1.5 py-0.5 text-xs text-muted">
                            {act.provider}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-text">{act.label_en}</td>
                      <td className="px-4 py-3 text-muted">{act.label_bn}</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-text">
                        {act.phone ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Icon icon="ph:phone" className="h-3.5 w-3.5" />
                            {act.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                            act.min_level === "High"
                              ? "bg-rose-500/10 text-rose-600"
                              : act.min_level === "Medium"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {act.min_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {act.verified_at ? (
                          <div>
                            <span className="text-text">{act.verified_at}</span>
                            {act.needs_reverification && (
                              <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1 text-[10px] font-bold text-amber-600">
                                &gt;90d
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">Unverified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {act.source_url ? (
                          <a
                            href={act.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand hover:underline max-w-[120px] truncate"
                          >
                            <span>Link</span>
                            <Icon icon="ph:arrow-square-out" className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            act.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-muted/10 text-muted border border-border"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              act.is_active ? "bg-emerald-500" : "bg-muted"
                            }`}
                          />
                          {act.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(act)}
                            className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text"
                            title="Edit action"
                          >
                            <Icon icon="ph:pencil-simple" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete safe action "${act.id}"?`)) {
                                deleteMutation.mutate(act.id);
                              }
                            }}
                            className="rounded p-1 text-muted hover:bg-rose-500/10 hover:text-rose-500"
                            title="Delete action"
                          >
                            <Icon icon="ph:trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-text">
                  {editingAction ? `Edit Safe Action: ${editingAction.id}` : "New Safe Action"}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
                className="mt-4 space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">ID (unique slug)</label>
                    <input
                      type="text"
                      disabled={!!editingAction}
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      required
                      placeholder="e.g. call_bkash_helpline"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text disabled:opacity-50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Provider (optional)</label>
                    <input
                      type="text"
                      value={formProvider}
                      onChange={(e) => setFormProvider(e.target.value)}
                      placeholder="e.g. bkash, nagad, rocket"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">Label (English)</label>
                    <input
                      type="text"
                      value={formLabelEn}
                      onChange={(e) => setFormLabelEn(e.target.value)}
                      required
                      placeholder="Call bKash helpline 16247"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Label (Bangla)</label>
                    <input
                      type="text"
                      value={formLabelBn}
                      onChange={(e) => setFormLabelBn(e.target.value)}
                      required
                      placeholder="বিকাশ হেল্পলাইন ১৬২৪৭ এ কল করুন"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-muted">Helpline Phone</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="16247 or 017..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Context</label>
                    <select
                      value={formContext}
                      onChange={(e) =>
                        setFormContext(e.target.value as "before_payment" | "after_payment" | "both")
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    >
                      <option value="before_payment">Before Payment</option>
                      <option value="after_payment">After Payment</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Min Risk Level</label>
                    <select
                      value={formMinLevel}
                      onChange={(e) => setFormMinLevel(e.target.value as "Low" | "Medium" | "High")}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">
                      Source Verification URL {formPhone && <span className="text-brand">*</span>}
                    </label>
                    <input
                      type="url"
                      value={formSourceUrl}
                      onChange={(e) => setFormSourceUrl(e.target.value)}
                      placeholder="https://www.bkash.com/contact"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">
                      Verified Date {formPhone && <span className="text-brand">*</span>}
                    </label>
                    <input
                      type="date"
                      value={formVerifiedAt}
                      onChange={(e) => setFormVerifiedAt(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    <div>
                      <span className="text-sm font-semibold text-text">Active</span>
                      <p className="text-xs text-muted">
                        Inactive until verified. If a phone number is entered, active status requires a valid source URL and verification date.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {saveMutation.isPending && (
                      <Icon icon="ph:spinner" className="h-4 w-4 animate-spin" />
                    )}
                    <span>{editingAction ? "Save Changes" : "Create Action"}</span>
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
