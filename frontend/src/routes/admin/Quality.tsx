import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppShell } from "@/components/AppShell";
import { adminApi, PromptVersion } from "@/features/admin/api";
import { ApiError } from "@/lib/api";

export default function AdminQuality() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [gateError, setGateError] = useState<{ versionId: number; message: string } | null>(null);

  const {
    data: quality,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-quality", fromDate, toDate],
    queryFn: () => adminApi.getQualityMetrics(fromDate || undefined, toDate || undefined),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => {
      setGateError(null);
      return adminApi.activatePrompt(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quality"] });
    },
    onError: (err: unknown, id: number) => {
      const apiErr = err instanceof ApiError ? err : null;
      setGateError({
        versionId: id,
        message:
          apiErr?.code === "eval_gate_failed" || (err instanceof Error && err.message.includes("eval_gate_failed"))
            ? "Activation blocked by Eval Gate: Section 10.7 quality targets not met or unsafe flags > 0 in the latest evaluation run."
            : err instanceof Error
            ? err.message
            : "Failed to activate prompt version.",
      });
    },
  });

  const kpis = [
    {
      label: "High Precision",
      value: quality?.kpi_precision != null ? `${(quality.kpi_precision * 100).toFixed(1)}%` : "N/A",
      target: "Target ≥ 90.0%",
      isMet: quality?.kpi_precision != null ? quality.kpi_precision >= 0.90 : null,
      icon: "ph:target",
    },
    {
      label: "High Recall",
      value: quality?.kpi_recall != null ? `${(quality.kpi_recall * 100).toFixed(1)}%` : "N/A",
      target: "Target ≥ 85.0%",
      isMet: quality?.kpi_recall != null ? quality.kpi_recall >= 0.85 : null,
      icon: "ph:arrows-in-cardinal",
    },
    {
      label: "Genuine Flagged High",
      value:
        quality?.kpi_genuine_high_rate != null
          ? `${(quality.kpi_genuine_high_rate * 100).toFixed(1)}%`
          : "N/A",
      target: "Target ≤ 3.0%",
      isMet: quality?.kpi_genuine_high_rate != null ? quality.kpi_genuine_high_rate <= 0.03 : null,
      icon: "ph:warning-octagon",
    },
    {
      label: "Unsafe Flags",
      value: quality?.kpi_unsafe_flags != null ? `${quality.kpi_unsafe_flags}` : "0",
      target: "Target = 0 (Strict)",
      isMet: (quality?.kpi_unsafe_flags ?? 0) === 0,
      icon: "ph:shield-warning",
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <AdminNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {t("admin.quality_title", "Quality & Evaluation Harness (S32)")}
            </h1>
            <p className="text-sm text-muted">
              {t(
                "admin.quality_subtitle",
                "Continuous benchmark metrics, model regression gates, and prompt activation guardrails.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted">
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded border border-border bg-background px-2 py-0.5 text-text focus:outline-none"
              />
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded border border-border bg-background px-2 py-0.5 text-text focus:outline-none"
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{quality?.notice || "Measured on simulated data only (simulated-v1)"}</span>
            </div>
          </div>
        </div>

        {/* Gate Failure Alert Banner */}
        {gateError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            <Icon icon="ph:shield-slash" className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Prompt Activation Blocked (409 eval_gate_failed):</span>
              <p className="mt-1 text-xs opacity-90">{gateError.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setGateError(null)}
              className="text-muted hover:text-text"
            >
              <Icon icon="ph:x" className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">{kpi.label}</span>
                <Icon icon={kpi.icon} className="h-4 w-4 text-muted" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-text">{kpi.value}</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {kpi.isMet === true && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <Icon icon="ph:check-circle" className="h-3.5 w-3.5" />
                    <span>{kpi.target}</span>
                  </span>
                )}
                {kpi.isMet === false && (
                  <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                    <Icon icon="ph:x-circle" className="h-3.5 w-3.5" />
                    <span>{kpi.target} (Failing)</span>
                  </span>
                )}
                {kpi.isMet === null && (
                  <span className="text-muted">{kpi.target}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Prompt Versions & Activation Gate */}
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-bold text-text">Prompt Versions & Activation Gate</h2>
            <p className="text-xs text-muted">
              Only prompt versions that pass the evaluation regression harness with zero unsafe flags can be activated.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="border-b border-border bg-background/50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Version Name</th>
                  <th className="px-4 py-3">Prompt Version</th>
                  <th className="px-4 py-3">SHA-256 Digest</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted">
                      Loading prompt versions…
                    </td>
                  </tr>
                ) : quality?.prompt_versions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted">
                      No prompt versions found.
                    </td>
                  </tr>
                ) : (
                  quality?.prompt_versions.map((p: PromptVersion) => (
                    <tr key={p.id} className="hover:bg-background/40">
                      <td className="px-4 py-3 font-semibold text-text">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand">{p.version}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted truncate max-w-[140px]">
                        {p.body_sha256}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-muted/10 text-muted border border-border"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.is_active ? "bg-emerald-500" : "bg-muted"
                            }`}
                          />
                          {p.is_active ? "Active in Production" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.is_active ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Current Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={activateMutation.isPending}
                            onClick={() => activateMutation.mutate(p.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors disabled:opacity-50"
                          >
                            {activateMutation.isPending &&
                            activateMutation.variables === p.id ? (
                              <Icon icon="ph:spinner" className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Icon icon="ph:rocket-launch" className="h-3.5 w-3.5" />
                            )}
                            <span>Activate Version</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Eval Runs Table */}
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-bold text-text">Recent Evaluation Runs</h2>
            <p className="text-xs text-muted">
              Benchmark results evaluated against the labelled regression dataset.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="border-b border-border bg-background/50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Run ID</th>
                  <th className="px-4 py-3">Prompt Version</th>
                  <th className="px-4 py-3">Dataset</th>
                  <th className="px-4 py-3">Cases</th>
                  <th className="px-4 py-3">Precision</th>
                  <th className="px-4 py-3">Recall</th>
                  <th className="px-4 py-3">Genuine High</th>
                  <th className="px-4 py-3">Unsafe Flags</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted">
                      Loading evaluation runs…
                    </td>
                  </tr>
                ) : quality?.eval_runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted">
                      No evaluation runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  quality?.eval_runs.map((r) => (
                    <tr key={r.id} className="hover:bg-background/40">
                      <td className="px-4 py-3 font-mono text-xs text-brand">#{r.id}</td>
                      <td className="px-4 py-3 font-medium text-text">
                        {r.prompt_version_name || r.prompt_version || "default"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {r.dataset_version}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.item_count}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.high_precision != null ? `${(r.high_precision * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.high_recall != null ? `${(r.high_recall * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.genuine_high_rate != null
                          ? `${(r.genuine_high_rate * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${
                            r.unsafe_flags === 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {r.unsafe_flags}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational & Token Metrics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Route Mix */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="font-bold text-text">Route Mix & Traffic Distribution</h3>
            <p className="text-xs text-muted mb-4">Traffic split between message and payment checks</p>
            <div className="space-y-3">
              {quality?.route_mix.map((rm) => (
                <div key={rm.route} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-text">{rm.route} Checks</span>
                    <span className="font-mono text-muted">
                      {rm.count} ({rm.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${Math.min(100, rm.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Cache & Token Efficiency */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="font-bold text-text">Prompt Caching & Token Efficiency</h3>
            <p className="text-xs text-muted mb-4">Anthropic prompt cache metrics</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted">Total Checks</span>
                <div className="text-xl font-bold font-mono text-text mt-1">
                  {quality?.total_checks ?? 0}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted">Cache Hit Rate</span>
                <div className="text-xl font-bold font-mono text-brand mt-1">
                  {quality ? `${(quality.cache_hit_rate * 100).toFixed(1)}%` : "0.0%"}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted">Input Tokens</span>
                <div className="text-lg font-bold font-mono text-text mt-1">
                  {quality?.total_input_tokens?.toLocaleString() ?? 0}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted">Cache Read Tokens</span>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {quality?.total_cache_read_tokens?.toLocaleString() ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
