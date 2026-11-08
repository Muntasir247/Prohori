import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppShell } from "@/components/AppShell";
import { adminApi, ApiKeyCreatedResult, ApiKeyItem } from "@/features/admin/api";

export default function AdminApiKeys() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [keyType, setKeyType] = useState<"test" | "live">("live");
  const [scopeChecksWrite, setScopeChecksWrite] = useState(true);
  const [scopeCasesRead, setScopeCasesRead] = useState(false);
  const [rateLimit, setRateLimit] = useState(60);
  const [createError, setCreateError] = useState<string | null>(null);

  // Key Shown Once Modal
  const [newKeyResult, setNewKeyResult] = useState<ApiKeyCreatedResult | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    data: keys = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: () => adminApi.listApiKeys(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null);
      const scopes: string[] = [];
      if (scopeChecksWrite) scopes.push("checks:write");
      if (scopeCasesRead) scopes.push("cases:read");
      if (scopes.length === 0) {
        throw new Error("Select at least one scope (checks:write or cases:read).");
      }

      return adminApi.createApiKey({
        name,
        key_type: keyType,
        scopes,
        rate_limit_per_min: rateLimit,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
      setIsCreateOpen(false);
      setNewKeyResult(data);
      setCopied(false);
    },
    onError: (err: Error) => {
      setCreateError(err.message || "Failed to create API key.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminApi.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    },
    onError: (err: Error) => {
      alert(`Revoke failed: ${err.message}`);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const sampleCurl = `curl -X POST https://api.prohori.org/api/v1/check-message \\
  -H "Authorization: Bearer prh_live_REPLACE_WITH_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "আপনার একাউন্ট স্থগিত করা হয়েছে। পিন দিন।"}'`;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <AdminNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* Header & Create Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">
              {t("admin.api_keys_title", "Partner API Keys")}
            </h1>
            <p className="text-sm text-text-2">
              {t(
                "admin.api_keys_subtitle",
                "Programmatic integration keys for mobile wallet partners (bKash, Nagad, banks). Raw keys are SHA-256 hashed and never stored.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setName("");
              setKeyType("live");
              setScopeChecksWrite(true);
              setScopeCasesRead(false);
              setRateLimit(60);
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-sm hover:bg-accent-hover transition-colors"
          >
            <Icon icon="ph:plus" className="h-4 w-4" />
            <span>{t("admin.new_api_key", "Create API Key")}</span>
          </button>
        </div>

        {/* Security & Partner Sandbox Info Box */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-text">
                <Icon icon="ph:terminal-window" className="h-4 w-4 text-brand" />
                <span>Partner Integration Example (cURL)</span>
              </div>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium"
              >
                <span>Interactive OpenAPI Docs (/docs)</span>
                <Icon icon="ph:arrow-square-out" className="h-3 w-3" />
              </a>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs font-mono text-text">
              {sampleCurl}
            </pre>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-sm text-text">
                <Icon icon="ph:lock-simple" className="h-4 w-4 text-success" />
                <span>Security Guarantee</span>
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Raw API keys are cryptographically generated and displayed once. The backend stores only
                one-way SHA-256 digests. If a key is lost, revoke it and issue a new one.
              </p>
            </div>
            <div className="mt-3 text-xs text-warning font-medium">
              Notice: Endpoints return simulated data tags during pilot phase.
            </div>
          </div>
        </div>

        {/* Keys Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted">
              <Icon icon="ph:spinner" className="h-5 w-5 animate-spin text-brand" />
              <span>Loading API keys…</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No API keys found. Create a key for partner integrations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text">
                <thead className="border-b border-border bg-background/50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Key Name</th>
                    <th className="px-4 py-3">Prefix / ID</th>
                    <th className="px-4 py-3">Scopes</th>
                    <th className="px-4 py-3">Rate Limit</th>
                    <th className="px-4 py-3">Last Used</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((k: ApiKeyItem) => (
                    <tr key={k.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-text">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand">
                        <span>{k.key_prefix}••••••••</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span
                              key={s}
                              className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted border border-border"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {k.rate_limit_per_min} req/min
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never used"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            k.is_active
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-risk-high/10 text-risk-high border border-risk-high/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              k.is_active ? "bg-success" : "bg-risk-high"
                            }`}
                          />
                          {k.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {k.is_active && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Revoke API key "${k.name}"? This cannot be undone.`)) {
                                revokeMutation.mutate(k.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-risk-high hover:bg-risk-high/10 transition-colors"
                          >
                            <Icon icon="ph:x-circle" className="h-3.5 w-3.5" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Key Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-text">Generate Partner API Key</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              {createError && (
                <div className="mt-4 rounded-lg border border-risk-high/30 bg-risk-high/10 p-3 text-xs text-risk-high">
                  {createError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-muted">Key Name / Partner</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. bKash Fraud Prevention Gateway"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted">Environment</label>
                    <select
                      value={keyType}
                      onChange={(e) => setKeyType(e.target.value as "test" | "live")}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    >
                      <option value="live">Live (prh_live_)</option>
                      <option value="test">Test (prh_test_)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Rate Limit (/min)</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={rateLimit}
                      onChange={(e) => setRateLimit(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Scopes</label>
                  <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopeChecksWrite}
                        onChange={(e) => setScopeChecksWrite(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      />
                      <div>
                        <span className="text-xs font-mono font-semibold text-text">checks:write</span>
                        <span className="block text-[11px] text-muted">
                          POST /check-message and POST /check-payment
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopeCasesRead}
                        onChange={(e) => setScopeCasesRead(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      />
                      <div>
                        <span className="text-xs font-mono font-semibold text-text">cases:read</span>
                        <span className="block text-[11px] text-muted">
                          GET /cases fraud queue feeds
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
                  >
                    {createMutation.isPending && (
                      <Icon icon="ph:spinner" className="h-4 w-4 animate-spin" />
                    )}
                    <span>Generate Key</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Key Shown Once Modal */}
        {newKeyResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border pb-4 text-success">
                <Icon icon="ph:key" className="h-6 w-6" />
                <h3 className="text-lg font-bold text-text">Partner API Key Generated</h3>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Icon icon="ph:warning-octagon" className="h-5 w-5 text-warning" />
                    <span>Save This Key Now</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">
                    This is the only time the raw API key will be shown. We store only a SHA-256 hash. If
                    you lose this key, you must revoke it and generate a new one.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">Full Raw API Key</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newKeyResult.raw_key}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-bold text-brand select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newKeyResult.raw_key)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent hover:bg-accent-hover shrink-0"
                    >
                      <Icon icon={copied ? "ph:check" : "ph:copy"} className="h-4 w-4" />
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-muted">
                  <div>
                    <span className="font-medium text-text">Key Name:</span> {newKeyResult.name}
                  </div>
                  <div>
                    <span className="font-medium text-text">Rate Limit:</span>{" "}
                    {newKeyResult.rate_limit_per_min} req/min
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setNewKeyResult(null)}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover"
                  >
                    I have saved this key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
