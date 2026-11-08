import { apiFetch } from "@/lib/api";

export interface KbChunk {
  id: number;
  chunk_index: number;
  content: string;
  token_count: number;
}

export interface KbDocument {
  id: string;
  code: string;
  title: string;
  scam_type_id: number;
  scam_type_slug?: string | null;
  scam_type_name?: string | null;
  language: string;
  source_url?: string | null;
  body: string;
  status: "Draft" | "Published" | "Archived";
  created_at: string;
  updated_at: string;
  chunk_count: number;
}

export interface KbDocumentDetail extends KbDocument {
  chunks: KbChunk[];
}

export interface SafeActionAdmin {
  id: string;
  label_en: string;
  label_bn: string;
  body_en?: string | null;
  body_bn?: string | null;
  context: "before_payment" | "after_payment" | "both";
  min_level: "Low" | "Medium" | "High";
  provider?: string | null;
  phone?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  is_active: boolean;
  sort_order: number;
  needs_reverification: boolean;
  warning?: string | null;
}

export interface PromptVersion {
  id: number;
  name: string;
  version: string;
  body_sha256: string;
  is_active: boolean;
  created_at: string;
}

export interface EvalRun {
  id: number;
  prompt_version_id?: number | null;
  prompt_version_name?: string | null;
  prompt_version?: string | null;
  dataset_version: string;
  item_count: number;
  high_precision?: number | null;
  high_recall?: number | null;
  genuine_high_rate?: number | null;
  unsafe_flags: number;
  report: Record<string, unknown>;
  created_at: string;
}

export interface RouteMixItem {
  route: string;
  count: number;
  percentage: number;
}

export interface QualityMetrics {
  kpi_precision?: number | null;
  kpi_recall?: number | null;
  kpi_genuine_high_rate?: number | null;
  kpi_unsafe_flags: number;
  prompt_versions: PromptVersion[];
  eval_runs: EvalRun[];
  route_mix: RouteMixItem[];
  total_checks: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  cache_hit_rate: number;
  notice: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "reviewer" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface AdminInviteResult {
  email: string;
  role: string;
  invite_url: string;
  expires_at: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  is_active: boolean;
}

export interface ApiKeyCreatedResult {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  created_at: string;
  raw_key: string;
  notice: string;
}

export interface AuditEvent {
  id: number;
  actor_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  request_id?: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  items: AuditEvent[];
  total: number;
  page: number;
  page_size: number;
}

export const adminApi = {
  // Knowledge Base
  listKnowledge: (params?: {
    scam_type?: string;
    language?: string;
    status?: string;
    search?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.scam_type) sp.set("scam_type", params.scam_type);
    if (params?.language) sp.set("language", params.language);
    if (params?.status) sp.set("status", params.status);
    if (params?.search) sp.set("search", params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<KbDocument[]>(`/admin/knowledge${qs}`);
  },

  createKnowledge: (data: {
    code: string;
    title: string;
    scam_type_id: number;
    language: string;
    source_url?: string;
    body: string;
  }) => apiFetch<KbDocumentDetail>("/admin/knowledge", { method: "POST", body: JSON.stringify(data) }),

  updateKnowledge: (
    id: string,
    data: {
      title?: string;
      scam_type_id?: number;
      language?: string;
      source_url?: string;
      body?: string;
    },
  ) => apiFetch<KbDocumentDetail>(`/admin/knowledge/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  publishKnowledge: (id: string) =>
    apiFetch<{ ok: boolean; document_id: string; chunks_published: number; status: string }>(
      `/admin/knowledge/${id}/publish`,
      { method: "POST" },
    ),

  // Safe Actions
  listSafeActions: () => apiFetch<SafeActionAdmin[]>("/admin/safe-actions"),

  createSafeAction: (data: Partial<SafeActionAdmin>) =>
    apiFetch<SafeActionAdmin>("/admin/safe-actions", { method: "POST", body: JSON.stringify(data) }),

  updateSafeAction: (id: string, data: Partial<SafeActionAdmin>) =>
    apiFetch<SafeActionAdmin>(`/admin/safe-actions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteSafeAction: (id: string) =>
    apiFetch<void>(`/admin/safe-actions/${id}`, { method: "DELETE" }),

  // Quality & Prompts
  getQualityMetrics: (fromDate?: string, toDate?: string) => {
    const sp = new URLSearchParams();
    if (fromDate) sp.set("from_date", fromDate);
    if (toDate) sp.set("to_date", toDate);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<QualityMetrics>(`/admin/quality${qs}`);
  },

  activatePrompt: (id: number) =>
    apiFetch<PromptVersion>(`/admin/prompts/${id}/activate`, { method: "POST" }),

  // Users
  listUsers: () => apiFetch<AdminUser[]>("/admin/users"),

  inviteUser: (data: { email: string; role: "reviewer" | "admin" }) =>
    apiFetch<AdminInviteResult>("/admin/users/invite", { method: "POST", body: JSON.stringify(data) }),

  updateUser: (id: string, data: { role?: "user" | "reviewer" | "admin"; is_active?: boolean }) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // API Keys
  listApiKeys: () => apiFetch<ApiKeyItem[]>("/admin/api-keys"),

  createApiKey: (data: {
    name: string;
    key_type: "test" | "live";
    scopes: string[];
    rate_limit_per_min: number;
  }) => apiFetch<ApiKeyCreatedResult>("/admin/api-keys", { method: "POST", body: JSON.stringify(data) }),

  revokeApiKey: (id: string) =>
    apiFetch<void>(`/admin/api-keys/${id}`, { method: "DELETE" }),

  // Audit Log
  listAuditLogs: (params?: {
    actor?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.actor) sp.set("actor", params.actor);
    if (params?.action) sp.set("action", params.action);
    if (params?.from_date) sp.set("from_date", params.from_date);
    if (params?.to_date) sp.set("to_date", params.to_date);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.page_size) sp.set("page_size", String(params.page_size));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<AuditLogResponse>(`/admin/audit${qs}`);
  },
};
