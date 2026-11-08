import { apiFetch } from "@/lib/api";
import type {
  AnalyticsOverviewResponse,
  CampaignsResponse,
  RepeatNumbersResponse,
  UpdateCampaignRequest,
  UpdateNumberStatusRequest,
  RepeatNumberItem,
  CampaignItem,
} from "./types";

export interface OverviewFilterParams {
  range?: string;
  from?: string;
  to?: string;
  scam_type?: string;
  risk_level?: string;
}

export const analyticsApi = {
  getOverview: (params?: OverviewFilterParams) => {
    const q = new URLSearchParams();
    if (params?.range) q.set("range", params.range);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.scam_type && params.scam_type !== "all") q.set("scam_type", params.scam_type);
    if (params?.risk_level && params.risk_level !== "all") q.set("risk_level", params.risk_level);
    const qs = q.toString();
    return apiFetch<AnalyticsOverviewResponse>(`/analytics/overview${qs ? `?${qs}` : ""}`);
  },

  listRepeatNumbers: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "all") q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<RepeatNumbersResponse>(`/analytics/numbers${qs ? `?${qs}` : ""}`);
  },

  updateNumberStatus: (id: string, payload: UpdateNumberStatusRequest) =>
    apiFetch<RepeatNumberItem>(`/analytics/numbers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  listCampaigns: (params?: {
    is_surging?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.is_surging !== undefined) q.set("is_surging", String(params.is_surging));
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<CampaignsResponse>(`/campaigns${qs ? `?${qs}` : ""}`);
  },

  updateCampaign: (id: string, payload: UpdateCampaignRequest) =>
    apiFetch<CampaignItem>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getExportCsvUrl: (params: {
    from: string;
    to: string;
    status?: string;
    scam_type?: string;
  }) => {
    const q = new URLSearchParams();
    q.set("from", params.from);
    q.set("to", params.to);
    if (params.status && params.status !== "all") q.set("status", params.status);
    if (params.scam_type && params.scam_type !== "all") q.set("scam_type", params.scam_type);
    return `/api/v1/cases/export.csv?${q.toString()}`;
  },
};

