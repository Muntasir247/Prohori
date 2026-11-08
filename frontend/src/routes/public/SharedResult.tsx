import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { HighlightedMessage } from "@/components/checks/HighlightedMessage";
import { RiskBanner } from "@/components/checks/RiskBanner";
import { RiskMeter } from "@/components/checks/RiskMeter";
import { checksApi } from "@/features/checks/api";
import type { SharedResultResponse } from "@/features/checks/types";

export default function SharedResult() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const isBn = i18n.language.startsWith("bn");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedResultResponse | null>(null);
  const [isExpiredOrInvalid, setIsExpiredOrInvalid] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsExpiredOrInvalid(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    checksApi
      .getSharedResult(token)
      .then((res) => {
        setData(res);
        setIsExpiredOrInvalid(false);
      })
      .catch(() => {
        // 410 or invalid tokens give identical expired state
        setIsExpiredOrInvalid(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6">
        <Icon icon="ph:spinner-bold" className="animate-spin text-3xl text-accent" />
        <p className="text-xs text-muted mt-3">{t("result.loading")}</p>
      </div>
    );
  }

  // 410 Expired or Invalid state (Doc 01 S21)
  if (isExpiredOrInvalid || !data) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-4">
        <div
          className="w-full max-w-md flex flex-col items-center text-center gap-4 rounded-3xl border border-border bg-surface p-8 shadow-sm"
          role="alert"
          data-testid="shared-expired-card"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
            <Icon icon="ph:clock-countdown-bold" className="text-3xl text-accent" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-bold text-text">
              {t("share.expired_title")}
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              {t("share.expired_desc")}
            </p>
          </div>

          <Link
            to="/check"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-xs font-bold text-bg shadow hover:bg-accent/90 transition-transform active:scale-98"
            data-testid="shared-check-own-btn"
          >
            <Icon icon="ph:shield-check-bold" className="text-base" />
            <span>{t("share.check_own_message")}</span>
          </Link>
        </div>
      </div>
    );
  }

  const level = data.level;
  const isLow = level === "Low";
  const helpline = data.safe_actions.find(
    (a) => a.phone != null || a.id.includes("helpline")
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Minimal Header (No full AppShell per S21 specification) */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-bg font-black text-sm">
              প্র
            </span>
            <span className="font-bold text-sm tracking-tight text-text">
              {t("app.name")}
            </span>
          </Link>

          <LanguageToggle />
        </div>
      </header>

      {/* Reader Column Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
        {/* Relative context header */}
        <div className="flex flex-col gap-1.5 rounded-2xl border border-accent/30 bg-surface-2 p-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-accent">
              <Icon icon="ph:users-three-bold" className="text-base" />
              <span>{t("share.shared_view_title")}</span>
            </div>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-2xs font-mono font-semibold text-accent">
              {t("share.expires_in")}
            </span>
          </div>
          <p className="text-muted leading-relaxed text-xs">
            {t("share.shared_by_relative")}
          </p>
        </div>

        {/* 1. RiskBanner */}
        <RiskBanner level={level} isFallback={false} />

        {/* Low risk caution */}
        {isLow && (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-risk-low/30 bg-risk-low-tint/40 p-3.5 text-xs text-text"
            role="note"
          >
            <Icon
              icon="ph:shield-warning-bold"
              className="text-base text-risk-low shrink-0 mt-0.5"
            />
            <span className="font-semibold leading-relaxed">
              {t("result.mandatory_low_caution")}
            </span>
          </div>
        )}

        {/* 2. RiskMeter */}
        <RiskMeter level={level} />

        {/* 3. Why this looks risky */}
        {data.reasons && data.reasons.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("result.why_this_looks_risky")}
            </h2>
            <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-text leading-relaxed">
              {data.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 4. Masked message content */}
        {data.masked_text && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <HighlightedMessage
              maskedText={data.masked_text}
              highlights={[]}
            />
            <p className="text-2xs text-muted font-medium flex items-center gap-1">
              <Icon icon="ph:lock-simple-bold" />
              <span>{t("share.privacy_guarantee")}</span>
            </p>
          </section>
        )}

        {/* 5. Safe actions */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            {t("result.what_to_do_now")}
          </h2>

          <div className="flex flex-col gap-3">
            {helpline && helpline.phone && (
              <a
                href={`tel:${helpline.phone}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-bg shadow hover:bg-accent/90 transition-transform active:scale-98"
                data-testid="shared-helpline-action"
              >
                <Icon icon="ph:phone-call-bold" className="text-lg" />
                <span>
                  {isBn && helpline.label_bn ? helpline.label_bn : helpline.label} ({helpline.phone})
                </span>
              </a>
            )}

            {data.safe_actions
              .filter((a) => a !== helpline)
              .map((action) => (
                <div
                  key={action.id}
                  className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-xs"
                >
                  <strong className="font-bold text-text">
                    {isBn && action.label_bn ? action.label_bn : action.label}
                  </strong>
                  {(action.body_bn || action.body) && (
                    <p className="text-muted leading-relaxed">
                      {isBn && action.body_bn ? action.body_bn : action.body}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </section>

        {/* 6. Zero leakage reassurance and Prohori CTA */}
        <div className="flex flex-col items-center text-center gap-3 pt-4 pb-8 border-t border-border mt-2">
          <p className="text-2xs text-muted max-w-md">
            {t("share.privacy_guarantee")}
          </p>
          <Link
            to="/check"
            className="flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
          >
            <Icon icon="ph:shield-plus-bold" />
            <span>{t("share.check_own_message")}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
