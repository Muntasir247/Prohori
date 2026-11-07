import { Icon } from "@iconify/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { RiskLevel } from "@/features/checks/types";

interface RiskBannerProps {
  level: RiskLevel;
  isFallback?: boolean;
}

export function RiskBanner({ level, isFallback }: RiskBannerProps) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Result page moves focus to the banner heading
    headingRef.current?.focus();
  }, [level]);

  if (isFallback || !level) {
    return (
      <div
        className="rounded-2xl border border-info/30 bg-info-tint p-5 text-text"
        role="alert"
        aria-live="polite"
        data-testid="risk-banner-unavailable"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-info/20 p-2 text-info">
            <Icon icon="ph:warning-circle-bold" className="text-3xl" aria-hidden />
          </div>
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-accent"
              data-testid="banner-heading"
            >
              {t("result.unavailable_title")}
            </h1>
            <p className="mt-1 text-sm text-text/80">{t("result.unavailable_subtitle")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (level === "High") {
    return (
      <div
        className="rounded-2xl border border-risk-high/30 bg-risk-high-tint p-5 text-text"
        role="alert"
        aria-live="polite"
        data-testid="risk-banner-high"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-risk-high/20 p-2 text-risk-high">
            <Icon icon="ph:octagon-bold" className="text-3xl" aria-hidden />
          </div>
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-accent"
              data-testid="banner-heading"
            >
              {t("result.high_title")}
            </h1>
            <p className="mt-1 text-sm text-text/80">{t("result.high_subtitle")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (level === "Medium") {
    return (
      <div
        className="rounded-2xl border border-risk-medium/30 bg-risk-medium-tint p-5 text-text"
        role="alert"
        aria-live="polite"
        data-testid="risk-banner-medium"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-risk-medium/20 p-2 text-risk-medium">
            <Icon icon="ph:warning-bold" className="text-3xl" aria-hidden />
          </div>
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-accent"
              data-testid="banner-heading"
            >
              {t("result.medium_title")}
            </h1>
            <p className="mt-1 text-sm text-text/80">{t("result.medium_subtitle")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (level === "Low") {
    return (
      <div
        className="rounded-2xl border border-risk-low/30 bg-risk-low-tint p-5 text-text"
        role="alert"
        aria-live="polite"
        data-testid="risk-banner-low"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-risk-low/20 p-2 text-risk-low">
            <Icon icon="ph:info-bold" className="text-3xl" aria-hidden />
          </div>
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-accent"
              data-testid="banner-heading"
            >
              {t("result.low_title")}
            </h1>
            <p className="mt-1 text-sm text-text/80">{t("result.low_subtitle")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback / Unavailable
  return (
    <div
      className="rounded-2xl border border-info/30 bg-info-tint p-5 text-text"
      role="alert"
      aria-live="polite"
      data-testid="risk-banner-unavailable"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-info/20 p-2 text-info">
          <Icon icon="ph:warning-circle-bold" className="text-3xl" aria-hidden />
        </div>
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-accent"
            data-testid="banner-heading"
          >
            {t("result.unavailable_title")}
          </h1>
          <p className="mt-1 text-sm text-text/80">{t("result.unavailable_subtitle")}</p>
        </div>
      </div>
    </div>
  );
}
