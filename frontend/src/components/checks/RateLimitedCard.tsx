import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export interface RateLimitedCardProps {
  retryAfterSeconds?: number;
  onRetry?: () => void;
}

/**
 * Dedicated 429 rate-limited safety card (Doc 01 S37, T21):
 * Displays wait time countdown, fixed safe advice, verified helpline, and
 * keeps the user's typed text intact in the form above.
 */
export function RateLimitedCard({
  retryAfterSeconds = 60,
  onRetry,
}: RateLimitedCardProps) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(Math.max(1, Math.round(retryAfterSeconds)));

  useEffect(() => {
    setSecondsLeft(Math.max(1, Math.round(retryAfterSeconds)));
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <section
      role="alert"
      aria-live="polite"
      data-testid="rate-limited-card"
      className="flex flex-col gap-4 rounded-lg border border-warning/40 bg-surface p-5 text-text"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warning-tint text-xl text-warning">
            <Icon icon="ph:hourglass-medium" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-text">
              {t("system.rate_limit_title")}
            </h2>
            <p className="mt-0.5 text-xs text-text-2 sm:text-sm">
              {t("system.rate_limit_body")}
            </p>
          </div>
        </div>
        <span
          data-testid="rate-limit-countdown"
          className="inline-flex min-w-12 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums text-warning"
        >
          {secondsLeft}s
        </span>
      </div>

      {/* Fixed safe advice while waiting */}
      <div className="rounded-md border border-border bg-surface-2 p-3.5 text-xs leading-relaxed text-text-2">
        <p className="font-semibold text-text">{t("system.rate_limit_advice_title")}</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>{t("system.rate_limit_advice_1")}</li>
          <li>{t("system.rate_limit_advice_2")}</li>
          <li>{t("system.rate_limit_advice_3")}</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href="tel:16247"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-bone px-4 text-xs font-semibold text-raat transition-opacity hover:opacity-90"
        >
          <Icon icon="ph:phone-call" className="text-base" aria-hidden />
          <span>{t("system.rate_limit_call_bkash")}</span>
        </a>
        <Link
          to="/already-sent"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-4 text-xs font-semibold text-text transition-colors hover:bg-surface-2"
        >
          <Icon icon="ph:siren" className="text-base text-risk-high" aria-hidden />
          <span>{t("system.offline_s18_link")}</span>
        </Link>
        {onRetry && secondsLeft === 0 && (
          <button
            type="button"
            onClick={onRetry}
            data-testid="rate-limit-retry-btn"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-on-accent hover:bg-accent-hover"
          >
            <Icon icon="ph:arrow-clockwise" className="text-base" aria-hidden />
            <span>{t("system.rate_limit_retry")}</span>
          </button>
        )}
      </div>
    </section>
  );
}
