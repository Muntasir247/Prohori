import { Icon } from "@iconify/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import { ReviewNav } from "@/components/review/ReviewNav";
import { analyticsApi } from "@/features/analytics/api";
import { useSession } from "@/features/auth/useSession";

export default function Reports() {
  const { t } = useTranslation();
  const { data: user } = useSession();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [status, setStatus] = useState("all");
  const [scamType, setScamType] = useState("all");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!user) return null;

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setValidationError("Please select valid start and end dates.");
      return;
    }

    if (start > end) {
      setValidationError("Start date cannot be after end date.");
      return;
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 366) {
      setValidationError("Date range cannot exceed 366 days (1 year maximum).");
      return;
    }

    setIsExporting(true);
    const url = analyticsApi.getExportCsvUrl({
      from: fromDate,
      to: toDate,
      status,
      scam_type: scamType,
    });

    // Trigger download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `prohori-cases-${fromDate}-to-${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
    }, 1500);
  };

  return (
    <AppShell wide>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {t("review.reports_title", "Reports & CSV Export")}
          </h1>
          <p className="text-sm text-muted">
            {t(
              "review.reports_subtitle",
              "Export reviewed cases and intelligence for reporting, law enforcement, or external audits."
            )}
          </p>
        </header>

        <ReviewNav />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Export Form Card */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Export Cases to CSV</h2>
            <p className="mt-1 text-xs text-muted">
              Select date ranges and filters to export case records. Streaming download begins immediately.
            </p>

            <form onSubmit={handleExport} className="mt-6 flex flex-col gap-5 text-xs">
              {validationError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-risk-high/30 bg-risk-high/10 p-3 text-risk-high font-medium"
                >
                  <Icon icon="ph:warning-circle" className="h-4 w-4 shrink-0 text-risk-high" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Date Pickers */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="export-from" className="font-medium text-text">
                    From Date (Required):
                  </label>
                  <input
                    id="export-from"
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="export-to" className="font-medium text-text">
                    To Date (Required):
                  </label>
                  <input
                    id="export-to"
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              {/* Status and Scam Type Dropdowns */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="export-status" className="font-medium text-text">
                    Case Status:
                  </label>
                  <select
                    id="export-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="all">All statuses</option>
                    <option value="confirmed_scam">Confirmed Scam</option>
                    <option value="not_a_scam">Not a Scam</option>
                    <option value="new">New</option>
                    <option value="in_review">In Review</option>
                    <option value="needs_escalation">Needs Escalation</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="export-scam-type" className="font-medium text-text">
                    Scam Type:
                  </label>
                  <select
                    id="export-scam-type"
                    value={scamType}
                    onChange={(e) => setScamType(e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="all">All scam types</option>
                    <option value="fake_wallet_staff">Fake Wallet Staff</option>
                    <option value="lottery_prize">Lottery Prize</option>
                    <option value="account_takeover">Account Takeover</option>
                    <option value="fake_job_offer">Fake Job Offer</option>
                    <option value="emergency_impersonation">Emergency Impersonation</option>
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                <span className="text-2xs text-muted">
                  Max date range: 366 days · Streamed direct from database
                </span>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-on-accent shadow-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
                >
                  <Icon
                    icon={isExporting ? "ph:spinner" : "ph:download-simple"}
                    className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`}
                  />
                  <span>{isExporting ? "Starting download…" : "Export CSV"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security & Audit Guidelines Card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Icon icon="ph:lock-simple" className="h-4 w-4 text-success" />
              <span>Export Compliance & Safety</span>
            </h3>

            <ul className="space-y-3 text-xs text-muted">
              <li className="flex items-start gap-2">
                <Icon icon="ph:check-circle" className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">PII Masking:</strong> Phone numbers and personal names are masked prior to export. Raw numbers are never included in CSV dumps.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="ph:check-circle" className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">Excel Bangla Encoding:</strong> Streamed with UTF-8 BOM (<code className="font-mono text-2xs bg-bg px-1 py-0.5 rounded">\xef\xbb\xbf</code>) so Microsoft Excel natively displays Bengali text correctly.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="ph:check-circle" className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">Formula Injection Defense:</strong> All cells starting with <code className="font-mono text-2xs bg-bg px-1 py-0.5 rounded">=</code>, <code className="font-mono text-2xs bg-bg px-1 py-0.5 rounded">+</code>, <code className="font-mono text-2xs bg-bg px-1 py-0.5 rounded">-</code>, or <code className="font-mono text-2xs bg-bg px-1 py-0.5 rounded">@</code> are sanitized with a leading quote to prevent spreadsheet code execution.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="ph:check-circle" className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">Audited Action:</strong> Every CSV generation is written to the immutable <code className="font-mono text-2xs bg-bg px-1 py-0.5 rounded">audit_events</code> table with your user ID and timestamp.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

