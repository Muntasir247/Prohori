export type RiskLevel = "High" | "Medium" | "Low" | null;

export interface HighlightItem {
  quote: string;
  flag: string;
  start: number;
  end: number;
}

export interface SafeActionItem {
  id: string;
  label: string;
  body?: string | null;
  phone?: string | null;
  label_bn?: string | null;
  body_bn?: string | null;
}

export interface EvidenceItem {
  code: string;
  title: string;
}

export interface ScamTypeSummary {
  slug: string;
  name: string;
}

export interface CheckResultResponse {
  id: string;
  final_level: RiskLevel;
  response_language: "bn" | "en";
  reasons: string[];
  red_flags: string[];
  highlights: HighlightItem[];
  safe_actions: SafeActionItem[];
  caution: string;
  scam_type?: ScamTypeSummary | null;
  evidence: EvidenceItem[];
  masked_text?: string | null;
  is_fallback: boolean;
  trimmed: boolean;
  has_reported: boolean;
  report_reference?: string | null;
  created_at: string;
}

export interface CheckMessageRequest {
  text: string;
  claimed_sender?: string | null;
  language_hint?: string | null;
}

export interface CheckPaymentRequest {
  amount_bdt: number | string;
  recipient_status: "known" | "new" | "not_sure";
  recipient_number?: string | null;
  request_channel: "phone_call" | "sms" | "whatsapp" | "in_person" | "online_shop" | "other";
  rushed: "yes" | "no" | "not_sure";
  provider?: "bkash" | "nagad" | "rocket" | "upay" | "other" | null;
  local_hour?: number | null;
  message_text?: string | null;
}

export interface CheckHistoryItem {
  id: string;
  kind: "message" | "payment";
  final_level: RiskLevel;
  masked_text?: string | null;
  amount_bdt?: number | null;
  scam_type?: ScamTypeSummary | null;
  has_reported: boolean;
  report_reference?: string | null;
  created_at: string;
}

export interface CheckHistoryResponse {
  items: CheckHistoryItem[];
  total: number;
  cursor?: string | null;
}

export interface SampleItem {
  id: number;
  label_en: string;
  label_bn: string;
  body: string;
  language: string;
}

export interface TipItem {
  id: number;
  title_en: string;
  title_bn: string;
  body_en: string;
  body_bn: string;
  active_from: string;
}

export interface SafeActionResponse {
  id: string;
  label_en: string;
  label_bn: string;
  body_en?: string | null;
  body_bn?: string | null;
  context: string;
  min_level: string;
  provider?: string | null;
  phone?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  is_active: boolean;
}

export interface CreateShareResponse {
  share_url: string;
  token: string;
  expires_at: string;
}

export interface SharedResultResponse {
  level: RiskLevel;
  masked_text?: string | null;
  reasons: string[];
  scam_type?: string | null;
  safe_actions: SafeActionItem[];
  expires_at: string;
}


