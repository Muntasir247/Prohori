import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppShell } from "@/components/AppShell";
import { adminApi, AdminInviteResult, AdminUser } from "@/features/admin/api";
import { ApiError } from "@/lib/api";

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"reviewer" | "admin">("reviewer");
  const [inviteResult, setInviteResult] = useState<AdminInviteResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Role Change Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<"user" | "reviewer" | "admin">("user");
  const [actionError, setActionError] = useState<string | null>(null);

  // Live Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: users = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.listUsers(),
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (u.display_name || "").toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const inviteMutation = useMutation({
    mutationFn: () => {
      setInviteError(null);
      return adminApi.inviteUser({ email: inviteEmail, role: inviteRole });
    },
    onSuccess: (data) => {
      setInviteResult(data);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      setInviteError(err.message || "Failed to create invitation link.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { role?: "user" | "reviewer" | "admin"; is_active?: boolean };
    }) => {
      setActionError(null);
      return adminApi.updateUser(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
    },
    onError: (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (
        apiErr?.code === "last_admin" ||
        (err instanceof Error && err.message.includes("last_admin"))
      ) {
        setActionError("Protection rule: Cannot demote or deactivate the last remaining administrator.");
      } else if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to update user.");
      }
    },
  });

  const openChangeRole = (user: AdminUser) => {
    setActionError(null);
    setEditingUser(user);
    setTargetRole(user.role);
  };

  const toggleActive = (user: AdminUser) => {
    if (user.role === "admin" && user.is_active) {
      const adminCount = users.filter((u) => u.role === "admin" && u.is_active).length;
      if (adminCount <= 1) {
        alert("Protection rule: Cannot deactivate the last remaining administrator.");
        return;
      }
    }
    const action = user.is_active ? "deactivate" : "activate";
    if (confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      updateMutation.mutate({
        id: user.id,
        data: { is_active: !user.is_active },
      });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <AdminNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* Title & Invite Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">
              {t("admin.users_title", "User & Role Management")}
            </h1>
            <p className="text-sm text-text-2">
              {t(
                "admin.users_subtitle",
                "Invite staff reviewers, manage permission tiers, and enforce administrator safeguards.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setInviteEmail("");
              setInviteRole("reviewer");
              setInviteResult(null);
              setInviteError(null);
              setIsInviteOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-on-accent transition-all hover:bg-brand/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Icon icon="ph:user-plus" className="h-4 w-4" />
            <span>{t("admin.invite_user", "Invite Reviewer / Admin")}</span>
          </button>
        </div>

        {/* Live Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/80 p-3.5 text-xs backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs text-muted font-semibold">Role:</span>
            {(["all", "admin", "reviewer", "user"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-xl px-3 py-1.5 text-2xs font-bold capitalize transition-all ${
                  roleFilter === r
                    ? "bg-accent text-on-accent"
                    : "border border-border/70 bg-surface-2 text-muted hover:bg-surface hover:text-text"
                }`}
              >
                {r === "all" ? "All roles" : r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border/80 bg-surface-2 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <div className="relative">
              <Icon
                icon="ph:magnifying-glass"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none"
              />
              <input
                type="search"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-border/80 bg-surface-2/70 pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-faint focus:outline-none focus:border-brand font-mono transition-all"
              />
            </div>
            {(roleFilter !== "all" || statusFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="flex items-start gap-3 rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 text-sm text-risk-high">
            <Icon icon="ph:warning" className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-muted hover:text-text"
            >
              <Icon icon="ph:x" className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-lg">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted">
              <Icon icon="ph:spinner-gap" className="h-5 w-5 animate-spin text-brand" />
              <span>Loading users…</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No users found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text">
                <thead className="border-b border-border/80 bg-surface-2/70 text-2xs text-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Display Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-text">
                        {u.display_name || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            u.role === "admin"
                              ? "bg-info/10 text-info border border-info/20"
                              : u.role === "reviewer"
                              ? "bg-info/10 text-info border border-info/20"
                              : "bg-muted/10 text-muted border border-border"
                          }`}
                        >
                          <Icon
                            icon={
                              u.role === "admin"
                                ? "ph:shield-chevron"
                                : u.role === "reviewer"
                                ? "ph:scales"
                                : "ph:user"
                            }
                            className="h-3 w-3"
                          />
                          <span>{u.role}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.is_active
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-risk-high/10 text-risk-high border border-risk-high/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.is_active ? "bg-success" : "bg-risk-high"
                            }`}
                          />
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openChangeRole(u)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted hover:bg-surface-hover hover:text-text transition-colors"
                            title="Change user role"
                          >
                            <Icon icon="ph:pencil-simple" className="h-3.5 w-3.5" />
                            <span>Change Role</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(u)}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                              u.is_active
                                ? "text-risk-high hover:bg-risk-high/10"
                                : "text-success hover:bg-success/10"
                            }`}
                          >
                            <Icon
                              icon={u.is_active ? "ph:user-minus" : "ph:user-check"}
                              className="h-3.5 w-3.5"
                            />
                            <span>{u.is_active ? "Deactivate" : "Activate"}</span>
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

        {/* Invite Reviewer Modal */}
        {isInviteOpen && (
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-text">Invite Team Member</h3>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              {inviteResult ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-success">
                    <div className="flex items-center gap-2 font-semibold">
                      <Icon icon="ph:check-circle" className="h-5 w-5" />
                      <span>Invitation Link Generated</span>
                    </div>
                    <p className="mt-1 text-xs opacity-90">
                      Single-use link valid for 48 hours. Send this link directly to{" "}
                      <strong>{inviteResult.email}</strong> to set up their {inviteResult.role} account.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Invite URL</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.invite_url}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-text select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.invite_url);
                          alert("Invite link copied to clipboard!");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-on-accent hover:bg-accent-hover shrink-0"
                      >
                        <Icon icon="ph:copy" className="h-4 w-4" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsInviteOpen(false)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    inviteMutation.mutate();
                  }}
                  className="mt-4 space-y-4"
                >
                  {inviteError && (
                    <div className="rounded-lg border border-risk-high/30 bg-risk-high/10 p-3 text-xs text-risk-high">
                      {inviteError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-muted">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="reviewer@example.com"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Assign Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "reviewer" | "admin")}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-brand focus:outline-none"
                    >
                      <option value="reviewer">Reviewer (Audit & Case Queue Access)</option>
                      <option value="admin">Admin (Full Administrative & Key Control)</option>
                    </select>
                  </div>

                  <p className="text-sm text-text-2">
                    Invitations expire after 48 hours. A single-use link will be created and displayed immediately.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsInviteOpen(false)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
                    >
                      {inviteMutation.isPending && (
                        <Icon icon="ph:spinner" className="h-4 w-4 animate-spin" />
                      )}
                      <span>Generate Invite Link</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Change Role Modal */}
        {editingUser && (
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-text">Change Role</h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Icon icon="ph:warning-circle" className="h-4 w-4" />
                    <span>Security Notice</span>
                  </div>
                  <p className="mt-1">
                    Changing a user's role immediately revokes all active sessions for {editingUser.email}.
                    They will need to sign in again with their new permissions.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">User</label>
                  <div className="mt-1 font-medium text-text">{editingUser.email}</div>
                </div>

                <div>
                  <label htmlFor="role-select" className="block text-xs font-medium text-muted">Select New Role</label>
                  <select
                    id="role-select"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as "user" | "reviewer" | "admin")}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                  >
                    <option value="user">User (Standard account)</option>
                    <option value="reviewer">Reviewer (Fraud review & cases)</option>
                    <option value="admin">Admin (Full administrative control)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: editingUser.id,
                        data: { role: targetRole },
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
                  >
                    {updateMutation.isPending && (
                      <Icon icon="ph:spinner" className="h-4 w-4 animate-spin" />
                    )}
                    <span>Update Role</span>
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
