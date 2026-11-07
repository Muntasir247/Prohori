import { Icon } from "@iconify/react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { PipelineSteps } from "@/components/checks/PipelineSteps";
import { Button } from "@/components/ui/Button";
import { checksApi } from "@/features/checks/api";
import type { SampleItem } from "@/features/checks/types";

export default function MessageCheck() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [text, setText] = useState("");
  const [claimedSender, setClaimedSender] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [showSamples, setShowSamples] = useState(false);
  const isBn = i18n.language === "bn";

  useEffect(() => {
    // Check if redirected with prefilled sample
    if (location.state?.prefilledText) {
      setText(location.state.prefilledText);
    }
    checksApi.getSamples().then(setSamples).catch(() => {});
  }, [location.state]);

  const isValid = text.trim().length >= 10 && text.trim().length <= 4000;

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
      }
    } catch {
      // Clipboard permission denied or unavailable
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await checksApi.checkMessage({
        text: text.trim(),
        claimed_sender: claimedSender || undefined,
        language_hint: isBn ? "bn" : "en",
      });

      // Navigate to result screen with the server returned result
      navigate(`/result/${result.id}`, { state: { result } });
    } catch (err: unknown) {
      setIsSubmitting(false);
      // NON-NEGOTIABLE: Preserve user typed text on error!
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        setError(t("errors.rate_limited"));
      } else {
        setError(t("errors.check_failed_retry"));
      }
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-xl py-4 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Link to="/check" className="flex items-center gap-1 hover:text-text">
            <Icon icon="ph:arrow-left-bold" />
            <span>{t("common.back")}</span>
          </Link>
        </div>

        {isSubmitting ? (
          <PipelineSteps />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {t("message_check.title")}
              </h1>
              <p className="text-xs text-muted leading-relaxed">
                {t("message_check.subtitle")}
              </p>
            </header>

            {/* Warning above textarea: Do not paste your own PIN or OTP */}
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-xs text-accent">
              <Icon icon="ph:warning-circle-bold" className="text-base shrink-0" aria-hidden />
              <span>{t("message_check.pin_warning")}</span>
            </div>

            {/* Message Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="message-text" className="text-xs font-semibold text-text">
                  {t("message_check.textarea_label")}
                </label>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  <Icon icon="ph:clipboard-bold" aria-hidden />
                  {t("message_check.paste_button")}
                </button>
              </div>

              <textarea
                id="message-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={t("message_check.placeholder")}
                className="w-full rounded-2xl border border-border bg-surface p-4 text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono leading-relaxed"
                data-testid="message-input"
              />

              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  {text.trim().length > 0 && text.trim().length < 10
                    ? t("message_check.too_short", { count: 10 - text.trim().length })
                    : text.length > 4000
                      ? t("message_check.too_long")
                      : ""}
                </span>
                {text.length >= 3500 && (
                  <span className={text.length > 4000 ? "text-risk-high font-bold" : ""}>
                    {text.length}/4000
                  </span>
                )}
              </div>
            </div>

            {/* Optional Details Accordion */}
            <details className="rounded-xl border border-border bg-surface p-4 group">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-text select-none">
                <span className="flex items-center gap-2">
                  <Icon icon="ph:sliders-horizontal-bold" className="text-accent" />
                  {t("message_check.optional_details_title")}
                </span>
                <Icon
                  icon="ph:caret-down-bold"
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="pt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted font-medium">
                    {t("message_check.sender_select_label")}
                  </span>
                  <select
                    value={claimedSender}
                    onChange={(e) => setClaimedSender(e.target.value)}
                    className="rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text focus:border-brand focus:outline-none"
                    data-testid="sender-select"
                  >
                    <option value="">{t("message_check.sender_not_sure")}</option>
                    <option value="bkash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ)</option>
                    <option value="rocket">Rocket (রকেট)</option>
                    <option value="upay">Upay (উপায়)</option>
                    <option value="bank">{t("message_check.sender_bank")}</option>
                    <option value="other">{t("message_check.sender_other")}</option>
                  </select>
                </label>
              </div>
            </details>

            {/* Try a sample chips link */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowSamples(!showSamples)}
                className="text-left text-xs font-semibold text-accent hover:underline flex items-center gap-1.5"
                data-testid="toggle-samples-btn"
              >
                <span>✨ {t("message_check.try_sample_link")}</span>
                <Icon icon={showSamples ? "ph:caret-up-bold" : "ph:caret-down-bold"} />
              </button>

              {showSamples && (
                <div className="flex flex-wrap gap-2 pt-1" data-testid="samples-container">
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setText(sample.body);
                        setShowSamples(false);
                      }}
                      className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-text hover:border-accent hover:text-accent transition-colors"
                      data-testid="sample-chip"
                    >
                      {isBn ? sample.label_bn : sample.label_en}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-xl border border-risk-high/30 bg-risk-high-tint p-3 text-xs text-risk-high"
                role="alert"
                data-testid="check-error-message"
              >
                <Icon icon="ph:warning-circle-bold" className="text-base shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || isSubmitting}
              className="w-full py-3.5 text-base font-bold shadow-md active:scale-98"
              data-testid="check-submit-button"
            >
              {t("message_check.submit_cta")}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
