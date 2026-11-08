import { apiFetch } from "@/lib/api";
import type { CaseDecisionPayload, CaseDetail, CaseListResponse, CaseNote } from "./types";

export const casesApi = {
  listCases: (params?: {
    status?: string;
    level?: string;
    scam_type?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "all") q.set("status", params.status);
    if (params?.level && params.level !== "all") q.set("level", params.level);
    if (params?.scam_type) q.set("scam_type", params.scam_type);
    if (params?.q) q.set("q", params.q);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString();
    return apiFetch<CaseListResponse>(`/cases${qs ? `?${qs}` : ""}`);
  },

  getCase: (id: string) => apiFetch<CaseDetail>(`/cases/${id}`),

  recordDecision: (id: string, payload: CaseDecisionPayload) =>
    apiFetch<CaseDetail>(`/cases/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addNote: (id: string, note: string) =>
    apiFetch<CaseNote>(`/cases/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
};
