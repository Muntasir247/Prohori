import { apiFetch } from "@/lib/api";
import type { CaseDecisionPayload, CaseDetail, CaseNote } from "./types";

export const casesApi = {
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

