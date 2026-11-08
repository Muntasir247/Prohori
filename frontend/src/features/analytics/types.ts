export interface KPIOverview {
  open_cases: number;
  high_today: number;
  median_time_to_decision: number; // minutes
  reviewer_agreement: number; // 0.0 - 1.0 (e.g. 0.95 = 95%)
}

export interface CasesByRiskItem {
  date: string;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface TopScamTypeItem {
  id: number;
  slug: string;
  name_en: string;
  name_bn: string;
  count: number;
  percentage: number;
}

export interface RepeatNumberSeriesItem {
  date: string;
  active_count: number;
}

export interface ReviewerDecisionSeriesItem {
  date: string;
  confirmed_scam: number;
  not_a_scam: number;
  needs_escalation: number;
  closed: number;
  total: number;
}

export interface SurgingCampaignRadar {
  id: string;
  label: string;
  scam_type_name: string | null;
  count_7d: number;
  prev_count_7d: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export interface AnalyticsOverviewResponse {
  kpis: KPIOverview;
  cases_by_risk: CasesByRiskItem[];
  top_scam_types: TopScamTypeItem[];
  repeat_numbers: RepeatNumberSeriesItem[];
  reviewer_decisions: ReviewerDecisionSeriesItem[];
  surging_campaigns: SurgingCampaignRadar[];
  simulated: boolean;
  version: string;
}

export interface SparklinePoint {
  date: string;
  count: number;
}

export interface RepeatNumberItem {
  id: string;
  masked_display: string;
  report_count: number;
  check_count: number;
  high_count: number;
  high_share: number;
  first_seen_at: string;
  last_seen_at: string;
  status: "watch" | "confirmed_risky" | "cleared";
  sparkline_30d: SparklinePoint[];
}

export interface RepeatNumbersResponse {
  items: RepeatNumberItem[];
  total: number;
}

export interface UpdateNumberStatusRequest {
  status: "watch" | "confirmed_risky" | "cleared";
  reason: string;
}

export interface CampaignItem {
  id: string;
  label: string;
  scam_type_id: number | null;
  scam_type_name: string | null;
  scam_type_name_bn: string | null;
  member_count: number;
  count_7d: number;
  prev_count_7d: number;
  is_surging: boolean;
  first_seen_at: string | null;
  last_seen_at: string | null;
  updated_at: string;
  sample_messages: string[];
  shared_numbers: string[];
  case_references: string[];
}

export interface CampaignsResponse {
  items: CampaignItem[];
  total: number;
}

export interface UpdateCampaignRequest {
  label?: string;
  merge_into?: string;
}

