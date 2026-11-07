import { apiFetch } from "@/lib/api";
import type {
  CheckHistoryResponse,
  CheckMessageRequest,
  CheckPaymentRequest,
  CheckResultResponse,
  SafeActionResponse,
  SampleItem,
  TipItem,
} from "./types";

export const checksApi = {
  checkMessage: (data: CheckMessageRequest) =>
    apiFetch<CheckResultResponse>("/check-message", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkPayment: (data: CheckPaymentRequest) =>
    apiFetch<CheckResultResponse>("/check-payment", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCheck: (id: string) => apiFetch<CheckResultResponse>(`/checks/${id}`),

  listChecks: (params?: { level?: string; kind?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set("level", params.level);
    if (params?.kind) q.set("kind", params.kind);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<CheckHistoryResponse>(`/checks${qs ? `?${qs}` : ""}`);
  },

  deleteCheck: (id: string) =>
    apiFetch<void>(`/checks/${id}`, {
      method: "DELETE",
    }),

  reportCheck: (id: string, data: { consent: boolean; note?: string | null }) =>
    apiFetch<{ reference: string }>(`/checks/${id}/report`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSamples: () => apiFetch<SampleItem[]>("/samples"),

  getCurrentTip: async (): Promise<TipItem | null> => {
    try {
      const res = await apiFetch<TipItem>("/tips/current");
      return res ?? null;
    } catch {
      return null;
    }
  },

  getSafeActions: (params?: { context?: string; provider?: string }) => {
    const q = new URLSearchParams();
    if (params?.context) q.set("context", params.context);
    if (params?.provider) q.set("provider", params.provider);
    const qs = q.toString();
    return apiFetch<SafeActionResponse[]>(`/safe-actions${qs ? `?${qs}` : ""}`);
  },
};

