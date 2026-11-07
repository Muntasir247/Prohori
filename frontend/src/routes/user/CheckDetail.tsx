import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { HighlightedMessage } from "@/components/checks/HighlightedMessage";
import { ReportModal } from "@/components/checks/ReportModal";
import { RiskBanner } from "@/components/checks/RiskBanner";
import { RiskMeter } from "@/components/checks/RiskMeter";
import { Button } from "@/components/ui/Button";
import { checksApi } from "@/features/checks/api";
import type { CheckResultResponse } from "@/features/checks/types";

export default function CheckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [result, setResult] = useState<CheckResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
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
  }, [id, t]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await checksApi.deleteCheck(id);
      navigate("/history");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setDeleteError(t("errors.cannot_delete_reported_check"));
      } else {
        setDeleteError(t("errors.delete_failed"));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-12 text-center text-muted">
          <Icon icon="ph:spinner-bold" className="animate-spin text-3xl mx-auto" />
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
            <p className="text-xs text-muted mt-1">{error}</p>
          </div>
          <Link to="/history" className="text-xs font-semibold text-accent hover:underline">
            ← {t("history.back_to_history")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const helplineAction = result.safe_actions.find(
    (a) => a.id.includes("helpline") || a.phone != null
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-xl py-4 flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <Link to="/history" className="flex items-center gap-1 hover:text-text">
            <Icon icon="ph:arrow-left-bold" />
            <span>{t("history.back_to_history")}</span>
          </Link>
          <span className="font-mono text-muted text-xs">
            {new Date(result.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Risk Banner & Meter (Read-only without Pressure Pause) */}
        <RiskBanner level={result.final_level} isFallback={result.is_fallback} />
        <RiskMeter level={result.final_level} />

        {/* Reasons */}
        {result.reasons.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("result.why_this_looks_risky")}
            </h2>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-text leading-relaxed">
              {result.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Masked text with highlights */}
        {result.masked_text && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <HighlightedMessage
              maskedText={result.masked_text}
              highlights={result.highlights || []}
            />
          </section>
        )}

        {/* Safe Actions */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            {t("result.what_to_do_now")}
          </h2>

          <div className="flex flex-col gap-2.5">
            {helplineAction?.phone ? (
              <a
                href={`tel:${helplineAction.phone}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg shadow hover:bg-accent/90"
              >
                <Icon icon="ph:phone-call-bold" className="text-lg" />
                <span>
                  {helplineAction.label} ({helplineAction.phone})
                </span>
              </a>
            ) : helplineAction ? (
              <div className="rounded-xl border border-border bg-surface p-3.5 text-xs text-text font-medium flex items-center gap-2">
                <Icon icon="ph:info-bold" className="text-base text-accent shrink-0" />
                <span>{t("result.official_app_helpline_notice")}</span>
              </div>
            ) : null}

            {result.safe_actions
              .filter((a) => a !== helplineAction)
              .map((action) => (
                <div
                  key={action.id}
                  className="rounded-xl border border-border bg-surface p-3.5"
                >
                  <strong className="text-xs font-bold text-text block">{action.label}</strong>
                  {action.body && <p className="text-xs text-muted mt-1">{action.body}</p>}
                </div>
              ))}
          </div>
        </section>

        {/* Report status or Report button */}
        <section className="flex flex-col gap-2 pt-2">
          {result.has_reported ? (
            <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-tint p-3 text-xs text-success">
              <span className="flex items-center gap-2 font-semibold">
                <Icon icon="ph:check-circle-bold" />
                {t("result.reported_status")}
              </span>
              {result.report_reference && (
                <span className="font-mono font-bold text-text">{result.report_reference}</span>
              )}
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setReportModalOpen(true)}
              className="w-full py-2.5 text-xs font-bold"
            >
              <Icon icon="ph:flag-bold" className="mr-1.5 text-base" />
              {t("result.report_this_message")}
            </Button>
          )}

          {/* Delete Check button */}
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-risk-high/30 bg-risk-high-tint/20 py-2.5 text-xs font-bold text-risk-high hover:bg-risk-high-tint/40 transition-colors"
            data-testid="open-delete-modal-btn"
          >
            <Icon icon="ph:trash-bold" />
            <span>{t("history.delete_check")}</span>
          </button>
        </section>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-base font-bold text-text">{t("history.delete_confirm_title")}</h3>
              <p className="text-xs text-muted leading-relaxed">
                {t("history.delete_confirm_desc")}
              </p>

              {deleteError && (
                <p className="text-xs text-risk-high font-medium" role="alert">
                  {deleteError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-risk-high text-bg hover:bg-risk-high/90"
                  data-testid="confirm-delete-button"
                >
                  {isDeleting ? t("common.deleting") : t("common.delete")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        <ReportModal
          checkId={result.id}
          maskedText={result.masked_text}
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onSuccess={(ref) => {
            setResult({ ...result, has_reported: true, report_reference: ref });
          }}
        />
      </div>
    </AppShell>
  );
}
