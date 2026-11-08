import { Icon } from "@iconify/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { RiskLevel } from "@/features/checks/types";

// Doc 01 §7 RiskBanner: full width of the reader column, tint fill, 48 px
// Bold icon, level word, one-line instruction. Risk is never colour alone:
// each level carries its word and its own icon shape. Lantern never appears here.
interface RiskBannerProps {
  level: RiskLevel;
  isFallback?: boolean;
}

type Variant = "high" | "medium" | "low" | "unavailable";

const STYLE: Record<
  Variant,
  { wrap: string; icon: string; iconWrap: string; heading: string; eyebrow: string }
> = {
  high: {
    wrap: "border-risk-high/50 bg-risk-high-tint",
    iconWrap: "text-risk-high",
    icon: "ph:hand-palm-bold",
    heading: "text-text",
    eyebrow: "text-risk-high",
  },
  medium: {
    wrap: "border-risk-medium/50 bg-risk-medium-tint",
    iconWrap: "text-risk-medium",
    icon: "ph:warning-bold",
    heading: "text-text",
    eyebrow: "text-risk-medium",
  },
  low: {
    wrap: "border-risk-low/50 bg-risk-low-tint",
    iconWrap: "text-risk-low",
    icon: "ph:info-bold",
    heading: "text-text",
    eyebrow: "text-risk-low",
  },
  unavailable: {
    wrap: "border-info/50 bg-info-tint",
    iconWrap: "text-info",
    icon: "ph:cloud-slash-bold",
    heading: "text-text",
    eyebrow: "text-info",
  },
};

export function RiskBanner({ level, isFallback }: RiskBannerProps) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Result page moves focus to the banner heading (Doc 01 §8).
    headingRef.current?.focus();
  }, [level]);

  const variant: Variant =
    isFallback || !level
      ? "unavailable"
      : level === "High"
        ? "high"
        : level === "Medium"
          ? "medium"
          : level === "Low"
            ? "low"
            : "unavailable";

  const s = STYLE[variant];
  const title =
    variant === "unavailable" ? t("result.unavailable_title") : t(`result.${variant}_title`);
  const subtitle =
    variant === "unavailable" ? t("result.unavailable_subtitle") : t(`result.${variant}_subtitle`);

  return (
    <div
      className={`animate-fade-up rounded-lg border p-5 sm:p-6 ${s.wrap}`}
      role="alert"
      aria-live="polite"
      data-testid={`risk-banner-${variant}`}
    >
      <div className="flex items-start gap-4">
        <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center ${s.iconWrap}`}>
          {variant === "high" ? (
            <>
              <Icon icon="ph:octagon-bold" className="absolute inset-0 h-12 w-12" aria-hidden />
              <Icon icon={s.icon} className="relative h-6 w-6" aria-hidden />
            </>
          ) : (
            <Icon icon={s.icon} className="h-12 w-12" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${s.eyebrow}`}>
            {t(`result.banner_eyebrow_${variant}`)}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={`mt-1 text-[26px] font-bold leading-tight sm:text-[28px] ${s.heading}`}
            data-testid="banner-heading"
          >
            {title}
          </h1>
          <p className="mt-2 max-w-prose text-base font-medium text-text sm:text-lg">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
