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
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {t("payment_check.title")}
              </h1>
              <p className="text-xs text-muted leading-relaxed">
                {t("payment_check.subtitle")}
              </p>
            </header>

            {/* Question 1: Amount */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
              <label htmlFor="payment-amount" className="text-sm font-bold text-text">
                {t("payment_check.amount_label")} (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted text-base">
                  ৳
                </span>
                <input
                  id="payment-amount"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-xl border border-border bg-surface-2 py-3 pl-9 pr-4 text-base font-bold text-text placeholder:text-muted focus:border-brand focus:outline-none"
                  data-testid="payment-amount-input"
                  required
                />
              </div>
            </div>

            {/* Question 2: Recipient Status (SegmentedControl) */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
              <span className="text-sm font-bold text-text">
                {t("payment_check.recipient_label")}
              </span>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 border border-border">
                {(["known", "new", "not_sure"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRecipientStatus(status)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                      recipientStatus === status
                        ? "bg-accent text-bg shadow"
                        : "text-muted hover:text-text"
                    }`}
                    data-testid={`recipient-status-${status}`}
                  >
                    {t(`payment_check.status_${status}`)}
                  </button>
                ))}
              </div>

              {/* Recipient Number & Provider */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted font-medium">
                    {t("payment_check.number_label")} ({t("payment_check.optional")})
                  </span>
                  <input
                    type="text"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    placeholder="01712345678"
                    className="rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text focus:border-brand focus:outline-none"
                    data-testid="recipient-number-input"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted font-medium">{t("payment_check.provider_label")}</span>
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
                    className="rounded-xl border border-border bg-surface-2 p-2.5 text-xs text-text focus:border-brand focus:outline-none"
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

            {/* Question 3: Channel (ChoiceChips) */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
              <span className="text-sm font-bold text-text">
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
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                      channel === c
                        ? "border-accent bg-accent text-bg"
                        : "border-border bg-surface-2 text-muted hover:text-text"
                    }`}
                    data-testid={`channel-chip-${c}`}
                  >
                    {t(`payment_check.channel_${c}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 4: Are you being rushed? */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
              <span className="text-sm font-bold text-text">
                {t("payment_check.rushed_label")}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["yes", "no", "not_sure"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRushed(r)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      rushed === r
                        ? "border-accent bg-accent/15 text-accent font-bold"
                        : "border-border bg-surface-2 text-muted hover:text-text"
                    }`}
                    data-testid={r === "yes" ? "rushed-yes-button" : `rushed-${r}`}
                  >
                    {t(`payment_check.rushed_${r}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional message text */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="optional-msg" className="text-xs font-semibold text-text">
                {t("payment_check.message_box_label")} ({t("payment_check.optional")})
              </label>
              <textarea
                id="optional-msg"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={3}
                placeholder={t("payment_check.message_box_placeholder")}
                className="w-full rounded-2xl border border-border bg-surface p-3.5 text-xs text-text placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-xl border border-risk-high/30 bg-risk-high-tint p-3 text-xs text-risk-high"
                role="alert"
                data-testid="payment-error-message"
              >
                <Icon icon="ph:warning-circle-bold" className="text-base shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || isSubmitting}
              className="w-full py-3.5 text-base font-bold shadow-md active:scale-98"
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
