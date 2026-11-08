import { Icon } from "@iconify/react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { PipelineSteps } from "@/components/checks/PipelineSteps";
import { Button } from "@/components/ui/Button";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";
import { checksApi } from "@/features/checks/api";
import type { SampleItem } from "@/features/checks/types";

const FALLBACK_SAMPLES: SampleItem[] = [
  {
    id: 1,
    label_en: "Fake OTP request (Bangla)",
    label_bn: "ভুয়া ওটিপি চাওয়া",
    body: "প্রিয় গ্রাহক, আপনার অ্যাকাউন্ট যাচাই করতে এখনই ৬ সংখ্যার কোডটি এই নম্বরে পাঠান, না হলে অ্যাকাউন্ট বন্ধ হয়ে যাবে।",
    language: "bn",
  },
  {
    id: 2,
    label_en: "Prize lure (Banglish)",
    label_bn: "লটারি বা ক্যাশব্যাকের প্রলোভন",
    body: "Congrats bhai! Apni amader lottery te 50000 taka jiteche. Taka nite hole ekhoni ei link e click kore 200 taka fee pathan.",
    language: "banglish",
  },
  {
    id: 3,
    label_en: "Fake wallet staff (English)",
    label_bn: "ভুয়া ওয়ালেট কর্মী",
    body: "Hello, I am calling from the wallet helpdesk. Your KYC has expired. Please read me the verification code we just sent so I can keep your account active.",
    language: "en",
  },
  {
    id: 4,
    label_en: "Wrong-number refund (Bangla)",
    label_bn: "ভুল নম্বরে টাকা ফেরত",
    body: "ভাই, ভুল করে আপনার নম্বরে টাকা চলে গেছে। দয়া করে টাকাটা এই নম্বরে ফেরত পাঠিয়ে দিন, খুব বিপদে আছি।",
    language: "bn",
  },
];

export default function MessageCheck() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useSession();
  useSyncLanguage(user);

  const [text, setText] = useState("");
  const [claimedSender, setClaimedSender] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>(FALLBACK_SAMPLES);
  const [showSamples, setShowSamples] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

  const isBn = i18n.language.startsWith("bn");

  useEffect(() => {
    // Check if redirected with prefilled sample
    if (location.state?.prefilledText) {
      setText(location.state.prefilledText);
      if (location.state?.isSample) {
        setIsSampleLoaded(true);
      }
    }
    checksApi
      .getSamples()
      .then((items) => {
        if (items && items.length > 0) {
          setSamples(items);
        }
      })
      .catch(() => {
        // Keep fallback samples
      });
  }, [location.state]);

  const isValid = text.trim().length >= 10 && text.trim().length <= 4000;

  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText(clipText);
          setIsSampleLoaded(false);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2000);
        }
      }
    } catch {
      // Clipboard permission denied or unavailable
    }
  };

  const handleClear = () => {
    setText("");
    setIsSampleLoaded(false);
    setError(null);
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
      <div className="mx-auto max-w-xl py-2 flex flex-col gap-6 w-full">
        {/* Back Link */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Link
            to="/check"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-1 text-muted hover:text-text hover:border-info/40 transition-colors"
          >
            <Icon icon="ph:arrow-left" />
            <span>{t("common.back")}</span>
          </Link>
        </div>

        {isSubmitting ? (
          <div className="double-bezel">
            <div className="double-bezel-inner p-6 sm:p-8">
              <PipelineSteps
                onTimeout={() => {
                  setIsSubmitting(false);
                  setError(t("errors.check_failed_retry"));
                }}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <header className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-info" />
                <span className="text-xs text-info font-semibold">
                  {isBn ? "মেসেজ নিরাপত্তা স্ক্যান" : "SMS SECURITY SCAN"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {t("message_check.title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed font-normal">
                {t("message_check.subtitle")}
              </p>
            </header>

            {/* Privacy Shield & PIN Warning Card */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-info/30 bg-info/10 p-4 text-xs text-text">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/20 text-info text-base shrink-0 mt-0.5">
                <Icon icon="ph:lock-simple" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-info">
                  {isBn ? "জিরো-নলেজ প্রটেকশন" : "Privacy Protected"}
                </span>
                <span className="text-muted leading-relaxed">
                  {t("message_check.pin_warning")}
                </span>
              </div>
            </div>

            {/* Message Textarea Container */}
            <div className="double-bezel">
              <div className="double-bezel-inner p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <label htmlFor="message-text" className="text-xs font-bold text-text flex items-center gap-1.5">
                    <Icon icon="ph:chat-text" className="text-info" />
                    <span>{t("message_check.textarea_label")}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {text.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:text-risk-high hover:bg-risk-high/10 transition-colors"
                        title={t("message_check.clear")}
                      >
                        <Icon icon="ph:x" />
                        <span>{t("message_check.clear")}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handlePaste}
                      className="group inline-flex items-center gap-1.5 rounded-lg bg-info/10 border border-info/30 px-2.5 py-1 text-xs font-bold text-info hover:bg-info hover:text-on-risk transition-all active:scale-95"
                    >
                      <Icon icon="ph:clipboard" />
                      <span>
                        {copiedNotification
                          ? (isBn ? "পেস্ট হয়েছে!" : "Pasted!")
                          : t("message_check.paste_button")}
                      </span>
                    </button>
                  </div>
                </div>

                <textarea
                  id="message-text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (isSampleLoaded) setIsSampleLoaded(false);
                  }}
                  rows={6}
                  placeholder={t("message_check.placeholder")}
                  className="min-h-[168px] w-full resize-y rounded-md bg-transparent p-1 text-base leading-relaxed text-text placeholder:text-faint focus:outline-none"
                  data-testid="message-input"
                />

                {isSampleLoaded && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-brand/10 px-2.5 py-1 text-2xs font-semibold text-brand">
                    <Icon icon="ph:flask" />
                    <span>{t("message_check.simulated_notice")}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted">
                  <span className="font-medium">
                    {text.trim().length > 0 && text.trim().length < 10
                      ? t("message_check.too_short", { count: 10 - text.trim().length })
                      : text.length > 4000
                        ? t("message_check.too_long")
                        : text.trim().length >= 10
                          ? (isBn ? "বিশ্লেষণের জন্য প্রস্তুত" : "Ready to analyze")
                          : (isBn ? "কমপক্ষে ১০ অক্ষর আবশ্যক" : "Min 10 characters required")}
                  </span>
                  <span className={`font-mono ${text.length > 4000 ? "text-risk-high font-bold" : text.length >= 3500 ? "text-warning font-semibold" : ""}`}>
                    {text.length}/4000
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Sender Details & Payment Link Accordion */}
            <details className="rounded-2xl border border-border bg-surface p-4 group transition-colors hover:border-border-strong">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-text select-none">
                <span className="flex items-center gap-2">
                  <Icon icon="ph:sliders-horizontal" className="text-warning" />
                  <span>{t("message_check.optional_details_title")}</span>
                </span>
                <Icon
                  icon="ph:caret-down"
                  className="transition-transform group-open:rotate-180 text-muted"
                />
              </summary>
              <div className="pt-3.5 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="text-muted font-semibold">
                    {t("message_check.sender_select_label")}
                  </span>
                  <select
                    value={claimedSender}
                    onChange={(e) => setClaimedSender(e.target.value)}
                    className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-text focus:border-info focus:outline-none"
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

                {/* S11 inline navigation helper */}
                <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted">{t("message_check.check_payment_link")}</span>
                  <Link
                    to="/check/payment"
                    className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                  >
                    <span>{t("check.card_payment_title")}</span>
                    <Icon icon="ph:arrow-right" />
                  </Link>
                </div>
              </div>
            </details>

            {/* Try a Sample Link & Drawer */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowSamples(!showSamples)}
                className="text-left text-xs font-bold text-warning hover:underline flex items-center gap-1.5 w-max"
                data-testid="toggle-samples-btn"
              >
                <span>{t("message_check.try_sample_link")}</span>
                <Icon icon={showSamples ? "ph:caret-up" : "ph:caret-down"} />
              </button>

              {showSamples && (
                <div className="flex flex-wrap gap-2 pt-1" data-testid="samples-container">
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setText(sample.body);
                        setIsSampleLoaded(true);
                        setShowSamples(false);
                      }}
                      className="rounded-full border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-text hover:border-info hover:text-info transition-all active:scale-95"
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
                className="flex items-center gap-2.5 rounded-2xl border border-risk-high/30 bg-risk-high/10 p-4 text-xs text-risk-high font-medium"
                role="alert"
                data-testid="check-error-message"
              >
                <Icon icon="ph:warning-circle" className="text-base shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button - Sticky on Mobile per Doc 01 S10 */}
            <div className="sticky bottom-4 z-10 sm:static">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!isValid || isSubmitting}
                className="w-full text-base font-bold shadow-lg sm:shadow-none"
                data-testid="check-submit-button"
              >
                {t("message_check.submit_cta")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
