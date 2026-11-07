import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { HighlightedMessage } from "@/components/checks/HighlightedMessage";
import { PressurePause } from "@/components/checks/PressurePause";
import { ReportModal } from "@/components/checks/ReportModal";
import { RiskBanner } from "@/components/checks/RiskBanner";
import { RiskMeter } from "@/components/checks/RiskMeter";
import { Button } from "@/components/ui/Button";
import { checksApi } from "@/features/checks/api";
import type { CheckResultResponse } from "@/features/checks/types";

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t } = useTranslation();

  const [result, setResult] = useState<CheckResultResponse | null>(
    (location.state?.result as CheckResultResponse) || null
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (!result && id) {
      setLoading(true);
      checksApi
        .getCheck(id)
        .then((res) => {
          setResult(res);
          setError(null);
        })
        .catch(() => {
          setError(t("errors.check_not_found"));
        })
        .finally(() => setLoading(false));
    }
  }, [id, result, t]);

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-12 flex flex-col items-center justify-center gap-3">
          <Icon icon="ph:spinner-bold" className="animate-spin text-3xl text-brand" />
          <p className="text-sm text-muted">{t("result.loading")}</p>
        </div>
      </AppShell>
    );
  }

  if (error || !result) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-risk-high/30 bg-risk-high-tint p-5 text-text">
            <h2 className="font-bold text-base text-risk-high">{t("errors.not_found")}</h2>
            <p className="text-xs text-muted mt-1">{error || t("result.not_found_desc")}</p>
          </div>
          <Link to="/check" className="text-xs font-semibold text-accent hover:underline">
            ← {t("result.check_another")}
          </Link>
        </div>
      </AppShell>
    );
  }

  // The client NEVER computes risk. Renders only what the server returned.
  const level = result.final_level;
  const isHigh = level === "High";
  const isLow = level === "Low";
  const isUnavailable = !level || result.is_fallback;

  // Primary helpline action resolution
  const helplineAction = result.safe_actions.find(
    (a) => a.id.includes("helpline") || a.phone != null
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-xl py-4 flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <Link to="/check" className="flex items-center gap-1 hover:text-text">
            <Icon icon="ph:arrow-left-bold" />
            <span>{t("common.back")}</span>
          </Link>
          <span className="font-mono text-muted text-xs">
            {new Date(result.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* 1. RiskBanner with focus and aria-live */}
        <RiskBanner level={level} isFallback={result.is_fallback} />

        {/* Mandatory Caution directly under headline for Low risk */}
        {isLow && (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-risk-low/30 bg-risk-low-tint/40 p-3.5 text-xs text-text"
            role="note"
            data-testid="mandatory-low-caution"
          >
            <Icon icon="ph:shield-warning-bold" className="text-base text-risk-low shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">
              {t("result.mandatory_low_caution")}
            </span>
          </div>
        )}

        {/* 2. RiskMeter (3 segments, never a percentage) */}
        <RiskMeter level={level} />

        {/* 3. Pressure Pause (High risk only, F32) */}
        {isHigh && <PressurePause />}

        {/* 4. Why this looks risky (2-4 reasons from server) */}
        {result.reasons.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              {isUnavailable ? t("result.warning_signs") : t("result.why_this_looks_risky")}
            </h2>
            <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-text leading-relaxed">
              {result.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 5. HighlightedMessage (Scam Anatomy on tap) */}
        {result.masked_text && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <HighlightedMessage
              maskedText={result.masked_text}
              highlights={result.highlights || []}
            />
          </section>
        )}

        {/* 6. What to do now (Safe actions) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            {t("result.what_to_do_now")}
          </h2>

          <div className="flex flex-col gap-3">
            {/* Primary helpline action */}
            {helplineAction && helplineAction.phone ? (
              <a
                href={`tel:${helplineAction.phone}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-bg shadow hover:bg-accent/90 transition-transform active:scale-98"
                data-testid="primary-helpline-action"
              >
                <Icon icon="ph:phone-call-bold" className="text-lg" />
                <span>
                  {helplineAction.label} ({helplineAction.phone})
                </span>
              </a>
            ) : (
              <div
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-xs text-text"
                data-testid="unverified-provider-notice"
              >
                <Icon icon="ph:info-bold" className="text-base text-accent shrink-0" />
                <span className="font-medium">
                  {t("result.official_app_helpline_notice")}
                </span>
              </div>
            )}

            {/* Other safe actions */}
            {result.safe_actions
              .filter((a) => a !== helplineAction)
              .map((action) => (
                <div
                  key={action.id}
                  className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
                >
                  <strong className="text-xs font-bold text-text">{action.label}</strong>
                  {action.body && (
                    <p className="text-xs text-muted leading-relaxed">{action.body}</p>
                  )}
                </div>
              ))}
          </div>
        </section>

        {/* 7. More Actions (Report, Share, Check another) */}
        <section className="flex flex-col gap-2 pt-2">
          {result.has_reported ? (
            <div
              className="flex items-center justify-between rounded-xl border border-success/30 bg-success-tint p-3 text-xs text-success"
              data-testid="reported-status-tag"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon icon="ph:check-circle-bold" />
                {t("result.reported_status")}
              </span>
              {result.report_reference && (
                <span className="font-mono font-bold text-text">
                  {result.report_reference}
                </span>
              )}
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setReportModalOpen(true)}
              className="w-full py-3 text-xs font-bold"
              data-testid="report-button"
            >
              <Icon icon="ph:flag-bold" className="mr-1.5 text-base" />
              {t("result.report_this_message")}
            </Button>
          )}

          <Link
            to="/check"
            className="flex items-center justify-center rounded-xl border border-border bg-surface py-3 text-xs font-bold text-text hover:bg-surface-2 transition-colors"
          >
            {t("result.check_another")}
          </Link>
        </section>

        {/* 8. How Prohori Decided (Accordion) */}
        <details className="rounded-xl border border-border bg-surface p-4 group text-xs text-text">
          <summary className="flex cursor-pointer items-center justify-between font-semibold select-none">
            <span>{t("result.how_decided_title")}</span>
            <Icon
              icon="ph:caret-down-bold"
              className="transition-transform group-open:rotate-180 text-muted"
            />
          </summary>
          <div className="pt-3 flex flex-col gap-2 text-muted leading-relaxed">
            <p>{t("result.how_decided_signals")}</p>
            {result.scam_type && (
              <p>
                <strong className="text-text">{t("result.matched_pattern")}: </strong>
                {result.scam_type.name}
              </p>
            )}
            <p className="text-2xs text-muted/80">{t("result.how_decided_disclaimer")}</p>
          </div>
        </details>

        {/* Caution footer */}
        <p className="text-center text-2xs text-muted italic leading-relaxed px-4">
          {t("result.final_caution_line")}
        </p>

        {/* S17 Report Modal */}
        <ReportModal
          checkId={result.id}
          maskedText={result.masked_text}
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onSuccess={(ref) => {
            setResult({
              ...result,
              has_reported: true,
              report_reference: ref,
            });
          }}
        />
      </div>
    </AppShell>
  );
}
