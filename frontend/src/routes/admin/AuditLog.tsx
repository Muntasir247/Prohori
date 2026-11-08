import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppShell } from "@/components/AppShell";
import { adminApi, AuditEvent } from "@/features/admin/api";
import { useDebounce } from "@/lib/useDebounce";

export default function AdminAuditLog() {
  const { t } = useTranslation();

  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const debouncedActor = useDebounce(actor, 300);
  const debouncedAction = useDebounce(action, 300);

  const [inspectingEvent, setInspectingEvent] = useState<AuditEvent | null>(null);

  const {
    data: auditData,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-audit", debouncedActor, debouncedAction, fromDate, toDate, page],
    queryFn: () =>
      adminApi.listAuditLogs({
        actor: debouncedActor || undefined,
        action: debouncedAction || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const events = auditData?.items ?? [];
  const total = auditData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <AdminNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* Title and Immutable Notice */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">
              {t("admin.audit_title", "System Audit Log")}
            </h1>
            <p className="text-sm text-text-2">
              {t(
                "admin.audit_subtitle",
                "Cryptographic immutable trail of reviewer decisions, document publications, and administrative actions.",
              )}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <Icon icon="ph:lock-key" className="h-3.5 w-3.5 text-brand" />
            <span>Append-only / Immutable</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-muted">Filter by Actor</label>
            <input
              type="text"
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                setPage(1);
              }}
              placeholder="Actor ID or role…"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-text focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted">Filter by Action</label>
            <input
              type="text"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. publish, invite, revoke…"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-text focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-text focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-text focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted">
              <Icon icon="ph:spinner" className="h-5 w-5 animate-spin text-brand" />
              <span>Loading audit events…</span>
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No audit events matched your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text">
                <thead className="border-b border-border bg-background/50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor & Role</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target Entity</th>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                        {new Date(evt.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-text">
                          {evt.actor_id ? `${evt.actor_id.slice(0, 8)}…` : "System"}
                        </div>
                        {evt.actor_role && (
                          <span className="inline-block rounded bg-background px-1.5 py-0.2 text-[10px] font-semibold uppercase text-brand border border-border">
                            {evt.actor_role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-xs text-brand">
                          {evt.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-text capitalize">
                          {evt.entity_type}
                        </span>{" "}
                        <span className="font-mono text-xs text-muted">
                          #{evt.entity_id.slice(0, 12)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted truncate max-w-[120px]">
                        {evt.request_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(evt.before || evt.after) && (
                          <button
                            type="button"
                            onClick={() => setInspectingEvent(evt)}
                            className="inline-flex items-center gap-1 rounded bg-background px-2.5 py-1 text-xs font-medium text-muted hover:text-brand border border-border hover:border-brand/40 transition-colors"
                          >
                            <Icon icon="ph:git-diff" className="h-3.5 w-3.5" />
                            <span>View Diff</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
              <div>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}{" "}
                events
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-border px-2.5 py-1 hover:bg-surface-hover disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-border px-2.5 py-1 hover:bg-surface-hover disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Before / After Diff Drawer */}
        {inspectingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-text">
                    Audit Diff: {inspectingEvent.action}
                  </h3>
                  <p className="text-sm text-text-2">
                    Entity: {inspectingEvent.entity_type} #{inspectingEvent.entity_id} ·{" "}
                    {new Date(inspectingEvent.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingEvent(null)}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between pb-1 text-xs font-semibold uppercase text-risk-high">
                    <span>State Before</span>
                    <Icon icon="ph:minus-circle" className="h-4 w-4" />
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 text-xs font-mono text-muted">
                    {inspectingEvent.before
                      ? JSON.stringify(inspectingEvent.before, null, 2)
                      : "null (Created)"}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1 text-xs font-semibold uppercase text-success">
                    <span>State After</span>
                    <Icon icon="ph:plus-circle" className="h-4 w-4" />
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 text-xs font-mono text-text">
                    {inspectingEvent.after
                      ? JSON.stringify(inspectingEvent.after, null, 2)
                      : "null (Deleted)"}
                  </pre>
                </div>
              </div>

              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setInspectingEvent(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

