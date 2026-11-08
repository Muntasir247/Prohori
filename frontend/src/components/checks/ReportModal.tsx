import { Icon } from "@iconify/react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { checksApi } from "@/features/checks/api";
import { Button } from "@/components/ui/Button";

interface ReportModalProps {
  checkId: string;
  maskedText?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reference: string) => void;
}

export function ReportModal({
  checkId,
  maskedText,
  isOpen,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError(t("report.consent_required"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await checksApi.reportCheck(checkId, {
        consent: true,
        note: note.trim() || null,
      });
      setReference(res.reference);
      onSuccess(res.reference);
    } catch {
      setError(t("report.error_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-4 animate-scaleUp"
        data-testid="report-modal"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-text font-bold text-lg">
            <Icon icon="ph:shield-warning-bold" className="text-risk-medium text-xl" aria-hidden />
            <h2 id="report-modal-title">{t("report.title")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={t("report.close")}
            data-testid="report-close-button"
          >
            <Icon icon="ph:x-bold" className="text-lg" />
          </button>
        </div>

        {reference ? (
          <div className="flex flex-col gap-4 py-4 text-center" data-testid="report-success-view">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
              <Icon icon="ph:check-circle-bold" className="text-3xl" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text">{t("report.success_title")}</h3>
              <p className="mt-1 text-sm text-muted">
                {t("report.reference_label")}:{" "}
                <span className="font-mono font-bold text-accent" data-testid="report-reference">
                  {reference}
                </span>
              </p>
            </div>
            <p className="text-xs text-muted">
              {t("report.success_note")}
            </p>
            <Button
              variant="primary"
              onClick={onClose}
              className="mt-2 w-full"
              data-testid="report-done-button"
            >
              {t("report.done")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {maskedText && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">
                  {t("report.preview_label")}
                </span>
                <div className="rounded-xl border border-border bg-surface-2 p-3 font-mono text-xs text-text/80 max-h-28 overflow-y-auto">
                  {maskedText}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="report-note" className="text-xs font-semibold text-text">
                {t("report.note_label")} <span className="text-muted font-normal">({t("report.optional")})</span>
              </label>
              <textarea
                id="report-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={3}
                placeholder={t("report.note_placeholder")}
                className="w-full rounded-xl border border-border bg-surface-2 p-3 text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                data-testid="report-note-input"
              />
              <span className="text-right text-xs text-muted">
                {note.length}/500
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-2 p-3.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
                  data-testid="report-consent-checkbox"
                />
                <span className="text-xs leading-relaxed text-text">
                  {t("report.consent_text")}
                </span>
              </label>
            </div>

            {error && (
              <p className="text-xs text-risk-high font-medium flex items-center gap-1.5" role="alert">
                <Icon icon="ph:warning-circle-bold" aria-hidden />
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t("report.cancel")}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!consent || submitting}
                data-testid="submit-report-button"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Icon icon="ph:spinner-bold" className="animate-spin" aria-hidden />
                    {t("report.sending")}
                  </span>
                ) : (
                  t("report.submit")
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

