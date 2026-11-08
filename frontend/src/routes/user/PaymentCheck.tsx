import { Icon } from "@iconify/react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { PipelineSteps } from "@/components/checks/PipelineSteps";
import { Button } from "@/components/ui/Button";
import { checksApi } from "@/features/checks/api";

export default function PaymentCheck() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [recipientStatus, setRecipientStatus] = useState<"known" | "new" | "not_sure">("new");
  const [recipientNumber, setRecipientNumber] = useState("");
  const [provider, setProvider] = useState<"bkash" | "nagad" | "rocket" | "upay" | "other">("bkash");
  const [channel, setChannel] = useState<
    "phone_call" | "sms" | "whatsapp" | "in_person" | "online_shop" | "other"
  >("phone_call");
  const [rushed, setRushed] = useState<"yes" | "no" | "not_sure">("yes");
  const [messageText, setMessageText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = amount.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await checksApi.checkPayment({
        amount_bdt: amount.trim(),
        recipient_status: recipientStatus,
        recipient_number: recipientNumber.trim() || undefined,
        provider,
        request_channel: channel,
        rushed,
        message_text: messageText.trim() || undefined,
      });

      navigate(`/result/${result.id}`, { state: { result } });
    } catch (err: unknown) {
      setIsSubmitting(false);
      // NON-NEGOTIABLE: Preserve inputs on error!
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
              <PipelineSteps />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <header className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-info" />
                <span className="text-xs text-info font-semibold">
                  PAYMENT FRAUD MODEL
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {t("payment_check.title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed font-normal">
                {t("payment_check.subtitle")}
              </p>
            </header>

            {/* Question 1: Amount */}
            <div className="double-bezel">
              <div className="double-bezel-inner p-5 flex flex-col gap-2.5">
                <label htmlFor="payment-amount" className="text-xs text-muted font-semibold">
                  {t("payment_check.amount_label")} (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-info text-xl font-mono">
                    ৳
                  </span>
                  <input
                    id="payment-amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-xl border border-border bg-bg/90 py-3.5 pl-10 pr-4 text-xl font-black text-text placeholder:text-muted focus:border-info focus:outline-none font-mono shadow-inner"
                    data-testid="payment-amount-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Question 2: Recipient Status (SegmentedControl) */}
            <div className="double-bezel">
              <div className="double-bezel-inner p-5 flex flex-col gap-3.5">
                <span className="text-xs text-muted font-semibold">
                  {t("payment_check.recipient_label")}
                </span>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-bg/80 p-1.5 border border-border">
                  {(["known", "new", "not_sure"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setRecipientStatus(status)}
                      className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                        recipientStatus === status
                          ? "bg-info text-on-risk shadow-sm"
                          : "text-muted hover:text-text"
                      }`}
                      data-testid={`recipient-status-${status}`}
                    >
                      {t(`payment_check.status_${status}`)}
                    </button>
                  ))}
                </div>

                {/* Recipient Number & Provider */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <label className="flex flex-col gap-1.5 text-xs">
                    <span className="text-muted font-semibold">
                      {t("payment_check.number_label")} ({t("payment_check.optional")})
                    </span>
                    <input
                      type="text"
                      value={recipientNumber}
                      onChange={(e) => setRecipientNumber(e.target.value)}
                      placeholder="01712345678"
                      className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-text placeholder:text-muted focus:border-info focus:outline-none font-mono"
                      data-testid="recipient-number-input"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs">
                    <span className="text-muted font-semibold">{t("payment_check.provider_label")}</span>
                    <select
                      value={provider}
                      onChange={(e) =>
                        setProvider(
                          e.target.value as
                            | "bkash"
                            | "nagad"
                            | "rocket"
                            | "upay"
                            | "other"
                        )
                      }
                      className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-text focus:border-info focus:outline-none"
                      data-testid="payment-provider-select"
                    >
                      <option value="bkash">bKash (বিকাশ)</option>
                      <option value="nagad">Nagad (নগদ)</option>
                      <option value="rocket">Rocket (রকেট)</option>
                      <option value="upay">Upay (উপায়)</option>
                      <option value="other">{t("payment_check.provider_other")}</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Question 3: Channel (ChoiceChips) */}
            <div className="double-bezel">
              <div className="double-bezel-inner p-5 flex flex-col gap-3">
                <span className="text-xs text-muted font-semibold">
                  {t("payment_check.channel_label")}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(
                    [
                      "phone_call",
                      "sms",
                      "whatsapp",
                      "in_person",
                      "online_shop",
                      "other",
                    ] as const
                  ).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChannel(c)}
                      className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${
                        channel === c
                          ? "border-info bg-info text-on-risk"
                          : "border-border bg-surface-2 text-muted hover:text-text hover:border-border-strong"
                      }`}
                      data-testid={`channel-chip-${c}`}
                    >
                      {t(`payment_check.channel_${c}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question 4: Are you being rushed? */}
            <div className="double-bezel">
              <div className="double-bezel-inner p-5 flex flex-col gap-3">
                <span className="text-xs text-muted font-semibold">
                  {t("payment_check.rushed_label")}
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["yes", "no", "not_sure"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRushed(r)}
                      className={`py-3 text-xs font-bold rounded-xl border transition-all ${
                        rushed === r
                          ? "border-warning bg-warning/15 text-warning font-bold"
                          : "border-border bg-surface-2 text-muted hover:text-text"
                      }`}
                      data-testid={r === "yes" ? "rushed-yes-button" : `rushed-${r}`}
                    >
                      {t(`payment_check.rushed_${r}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional message text */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="optional-msg" className="text-xs font-semibold text-muted">
                {t("payment_check.message_box_label")} ({t("payment_check.optional")})
              </label>
              <textarea
                id="optional-msg"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={3}
                placeholder={t("payment_check.message_box_placeholder")}
                className="w-full rounded-2xl border border-border bg-surface p-3.5 text-xs text-text placeholder:text-muted focus:border-info focus:outline-none font-mono"
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-2xl border border-risk-high/30 bg-risk-high/10 p-4 text-xs text-risk-high font-medium"
                role="alert"
                data-testid="payment-error-message"
              >
                <Icon icon="ph:warning-circle" className="text-base shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isValid || isSubmitting}
              className="w-full text-base font-bold"
              data-testid="payment-submit-button"
            >
              {t("payment_check.submit_cta")}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
