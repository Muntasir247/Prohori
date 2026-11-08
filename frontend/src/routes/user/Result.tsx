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
import type { CheckResultResponse, CreateShareResponse } from "@/features/checks/types";

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [result, setResult] = useState<CheckResultResponse | null>(
    (location.state?.result as CheckResultResponse) || null
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Share state (F33)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<CreateShareResponse | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);

  // Read aloud state (F37)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeVoice, setActiveVoice] = useState<SpeechSynthesisVoice | null>(null);

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

  // Voice detection for Read Aloud (Doc 02 Feature F37)
  // Strictly hide the button when no matching bn-BD / bn-IN voice exists for Bengali mode
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setActiveVoice(null);
      return;
    }

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const isBn = i18n.language.startsWith("bn");
      if (isBn) {
        const bnVoice = voices.find(
          (v) =>
            v.lang === "bn-BD" ||
            v.lang === "bn-IN" ||
            v.lang.toLowerCase().replace("_", "-").startsWith("bn")
        );
        setActiveVoice(bnVoice || null);
      } else {
        const enVoice = voices.find((v) =>
          v.lang.toLowerCase().startsWith("en")
        );
        setActiveVoice(enVoice || null);
      }
    };

    checkVoices();
    window.speechSynthesis.onvoiceschanged = checkVoices;

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [i18n.language]);

  const toggleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!result || !activeVoice) return;

    const isBn = i18n.language.startsWith("bn");
    const levelText = result.final_level || "";
    const reasonsText = result.reasons.join(". ");
    const safeActionsText = result.safe_actions.map((a) => a.label).join(". ");

    const text = isBn
      ? `ঝুঁকির মাত্রা: ${levelText}। কেন এটি ঝুঁকিপূর্ণ: ${reasonsText}। এখন করণীয়: ${safeActionsText}`
      : `Risk level: ${levelText}. Why this looks risky: ${reasonsText}. Recommended steps: ${safeActionsText}`;

    const UtteranceClass = window.SpeechSynthesisUtterance;
    if (!UtteranceClass) return;

    const utterance = new UtteranceClass(text);
    utterance.voice = activeVoice;
    utterance.lang = activeVoice.lang;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleShare = async () => {
    if (!result) return;
    setShareLoading(true);
    setIsRevoked(false);
    try {
      const res = await checksApi.createShareLink(result.id);
      setShareData(res);
      setShareModalOpen(true);

      const fullUrl = `${window.location.origin}${res.share_url}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: t("share.share_title"),
            text: t("share.share_desc"),
            url: fullUrl,
          });
        } catch {
          // Non-fatal: modal remains open for copy
        }
      }
    } catch {
      // Ignore network error
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareData) return;
    const fullUrl = `${window.location.origin}${shareData.share_url}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      });
    }
  };

  const handleRevokeShare = async () => {
    if (!result) return;
    try {
      await checksApi.revokeShareLink(result.id);
      setIsRevoked(true);
      setShareData(null);
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-12 flex flex-col items-center justify-center gap-3">
          <Icon icon="ph:spinner" className="animate-spin text-3xl text-text-2" />
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
            <p className="text-sm text-text-2 mt-1">{error || t("result.not_found_desc")}</p>
          </div>
          <Link to="/check" className="text-xs font-semibold text-text-2 hover:underline">
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
            <Icon icon="ph:arrow-left" />
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
            <Icon icon="ph:warning" className="text-base text-risk-low shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">
              {t("result.mandatory_low_caution")}
            </span>
          </div>
        )}

        {/* 2. RiskMeter (3 segments, never a percentage) */}
        <RiskMeter level={level} />

        {/* 3. Pressure Pause (High risk only, F32, records ack via API) */}
        {isHigh && <PressurePause checkId={result.id} />}

        {/* 4. Why this looks risky (2-4 reasons from server) */}
        {result.reasons.length > 0 && (
          <section className="double-bezel">
            <div className="double-bezel-inner p-5 sm:p-6 flex flex-col gap-3.5">
              <h2 className="text-xs text-muted font-semibold">
                {isUnavailable ? t("result.warning_signs") : t("result.why_this_looks_risky")}
              </h2>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-text leading-relaxed font-medium">
                {result.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-warning font-bold mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 5. HighlightedMessage (Scam Anatomy on tap) */}
        {result.masked_text && (
          <section className="double-bezel">
            <div className="double-bezel-inner p-5 sm:p-6 flex flex-col gap-3">
              <HighlightedMessage
                maskedText={result.masked_text}
                highlights={result.highlights || []}
              />
            </div>
          </section>
        )}

        {/* 6. What to do now (Safe actions) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs text-muted font-semibold">
            {t("result.what_to_do_now")}
          </h2>

          <div className="flex flex-col gap-3">
            {/* Primary helpline action */}
            {helplineAction && helplineAction.phone ? (
              <a
                href={`tel:${helplineAction.phone}`}
                className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-md bg-bone px-5 text-base font-semibold text-raat transition-colors duration-[120ms] hover:bg-bone/90 active:translate-y-px"
                data-testid="primary-helpline-action"
              >
                <Icon icon="ph:phone-call" className="text-lg" />
                <span>
                  {helplineAction.label} ({helplineAction.phone})
                </span>
              </a>
            ) : (
              <div
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-xs text-text"
                data-testid="unverified-provider-notice"
              >
                <Icon icon="ph:info" className="text-base text-warning shrink-0" />
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
                  className="double-bezel"
                >
                  <div className="double-bezel-inner p-4 flex flex-col gap-1">
                    <strong className="text-xs font-bold text-text">{action.label}</strong>
                    {action.body && (
                      <p className="text-sm text-text-2 leading-relaxed font-normal">{action.body}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* 7. More Actions (Report, Share, Read aloud, Already sent, Check another) */}
        <section className="flex flex-col gap-2.5 pt-2">
          {/* Action Row: Read aloud & Share */}
          <div className="flex flex-col gap-2 sm:flex-row [&>*]:flex-1">
            {/* Ask someone you trust (F33) */}
            <Button
              variant="secondary"
              onClick={handleShare}
              disabled={shareLoading}
              className="w-full min-h-11 text-[15px] font-medium flex items-center justify-center gap-2"
              data-testid="share-button"
            >
              <Icon icon="ph:share-network" className="text-base text-text-2" />
              <span>{t("share.ask_trusted")}</span>
            </Button>

            {/* Read aloud (F37: strictly hidden when no voice exists) */}
            {activeVoice && (
              <Button
                variant="secondary"
                onClick={toggleReadAloud}
                className="w-full min-h-11 text-[15px] font-medium flex items-center justify-center gap-2"
                data-testid="read-aloud-button"
              >
                <Icon
                  icon={isSpeaking ? "ph:stop-circle" : "ph:speaker-high"}
                  className={`text-base ${isSpeaking ? "text-risk-high" : "text-text-2"}`}
                />
                <span>
                  {isSpeaking ? t("read_aloud.stop_reading") : t("read_aloud.read_aloud")}
                </span>
              </Button>
            )}
          </div>

          {/* S18 Already Sent Money link */}
          <Link
            to="/already-sent"
            className="flex items-center justify-center gap-2 rounded-md border border-risk-high/40 bg-surface min-h-11 text-[15px] font-medium text-text hover:bg-surface-2 transition-colors"
            data-testid="already-sent-link"
          >
            <Icon icon="ph:warning-circle" className="text-base text-risk-high" />
            <span>{t("already_sent.btn_text")}</span>
          </Link>

          {/* Report button */}
          {result.has_reported ? (
            <div
              className="flex items-center justify-between rounded-xl border border-success/30 bg-success-tint p-3 text-xs text-success"
              data-testid="reported-status-tag"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon icon="ph:check-circle" />
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
              className="w-full min-h-11 text-[15px] font-medium"
              data-testid="report-button"
            >
              <Icon icon="ph:flag" className="mr-1.5 text-base" />
              {t("result.report_this_message")}
            </Button>
          )}

          <Link
            to="/check"
            className="flex items-center justify-center rounded-md border border-border bg-surface min-h-11 text-[15px] font-medium text-text hover:bg-surface-2 transition-colors"
          >
            {t("result.check_another")}
          </Link>
        </section>

        {/* 8. How Prohori Decided (Accordion) */}
        <details className="rounded-xl border border-border bg-surface p-4 group text-xs text-text">
          <summary className="flex cursor-pointer items-center justify-between font-semibold select-none">
            <span>{t("result.how_decided_title")}</span>
            <Icon
              icon="ph:caret-down"
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
            <p className="text-2xs text-faint">{t("result.how_decided_disclaimer")}</p>
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

        {/* Share Modal (F33, S21) */}
        {shareModalOpen && (
          <div
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-raat/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
          >
            <div className="w-full max-w-md flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="ph:share-network" className="text-xl text-text-2" />
                  <h3 id="share-modal-title" className="text-sm font-bold text-text">
                    {t("share.ask_trusted")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShareModalOpen(false)}
                  className="rounded-lg p-1 text-muted hover:text-text"
                  aria-label={t("share.close")}
                >
                  <Icon icon="ph:x" className="text-lg" />
                </button>
              </div>

              {isRevoked ? (
                <div className="rounded-xl border border-risk-high/30 bg-risk-high-tint p-4 text-xs text-text">
                  <p className="font-semibold text-risk-high">{t("share.link_revoked")}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-text-2 leading-relaxed">
                    {t("share.share_desc")}
                  </p>

                  {shareData && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}${shareData.share_url}`}
                          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-mono text-text select-all"
                          data-testid="share-url-input"
                        />
                        <Button
                          variant="calm"
                          onClick={handleCopyShareLink}
                          className="shrink-0 text-xs px-3 py-2"
                          data-testid="copy-share-btn"
                        >
                          <Icon
                            icon={copySuccess ? "ph:check" : "ph:copy"}
                            className="mr-1"
                          />
                          <span>{copySuccess ? t("share.link_copied") : t("share.copy_link")}</span>
                        </Button>
                      </div>

                      <div className="flex items-center justify-between text-2xs text-muted pt-1">
                        <span className="flex items-center gap-1 font-semibold text-text-2">
                          <Icon icon="ph:clock" />
                          {t("share.expires_in")}
                        </span>
                        <button
                          type="button"
                          onClick={handleRevokeShare}
                          className="text-risk-high hover:underline font-semibold"
                          data-testid="revoke-share-btn"
                        >
                          {t("share.revoke_link")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border bg-surface-2 p-3 text-2xs text-muted leading-relaxed flex items-start gap-2">
                    <Icon icon="ph:lock-simple" className="text-base text-text-2 shrink-0 mt-0.5" />
                    <span>{t("share.privacy_guarantee")}</span>
                  </div>
                </>
              )}

              <Button
                variant="secondary"
                onClick={() => setShareModalOpen(false)}
                className="w-full py-2.5 text-xs font-bold"
              >
                {t("share.close")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
