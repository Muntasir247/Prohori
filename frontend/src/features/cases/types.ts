export interface ScamTypeSummary {
  id: number;
  slug: string;
  name_en: string;
  name_bn: string;
}

export interface CheckNumberDetail {
  role: string;
  masked_display: string;
  status: string;
  report_count: number;
  check_count: number;
}

export interface CaseNote {
  id: string;
  case_id: string;
  author_id: string | null;
  author_name: string | null;
  note: string;
  created_at: string;
}

export interface CaseTimelineItem {
  id: string;
  action: string;
  actor_id: string | null;
  created_at: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface CaseCheckDetail {
  id: string;
  kind: "message" | "payment";
  final_level: "High" | "Medium" | "Low" | null;
  rule_hits?: string[];
  reasons?: string[];
  red_flags?: Array<{ quote: string; flag: string }>;
  safe_actions?: string[];
  masked_text?: string;
  route?: string;
  latency_ms?: number;
  is_fallback?: boolean;
  prompt_version?: string;
  model_name?: string;
  risk_score?: number;
  created_at?: string;
}

export interface CaseDetail {
  id: string;
  reference: string;
  status: "new" | "in_review" | "confirmed_scam" | "not_scam" | "escalated" | "closed";
  version: number;
  created_at: string;
  decided_at?: string | null;
  decided_by?: string | null;
  decision_reason?: string | null;
  reporter_note?: string | null;
  reporter_consent_at: string;
  scam_type?: ScamTypeSummary | null;
  check: CaseCheckDetail;
  numbers: CheckNumberDetail[];
  notes: CaseNote[];
  timeline: CaseTimelineItem[];
}

export interface CaseDecisionPayload {
  decision: "confirmed_scam" | "not_scam" | "escalated" | "closed";
  reason: string;
  version: number;
  scam_type_id?: number | null;
}

