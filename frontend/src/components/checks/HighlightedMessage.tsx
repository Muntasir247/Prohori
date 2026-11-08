import { Icon } from "@iconify/react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { HighlightItem } from "@/features/checks/types";

interface HighlightedMessageProps {
  maskedText: string;
  highlights: HighlightItem[];
}

export function HighlightedMessage({ maskedText, highlights }: HighlightedMessageProps) {
  const { t } = useTranslation();
  const [activeHighlight, setActiveHighlight] = useState<HighlightItem | null>(null);

  if (!maskedText) return null;

  // If no highlights, render plain masked text
  if (!highlights || highlights.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg/80 p-4 text-sm leading-relaxed text-text font-mono whitespace-pre-wrap shadow-inner">
        {maskedText}
      </div>
    );
  }

  // Sort highlights by start offset
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  sorted.forEach((h, i) => {
    // If overlap or out of bounds, skip
    if (h.start < lastIndex || h.start >= maskedText.length) return;

    if (h.start > lastIndex) {
      segments.push(maskedText.substring(lastIndex, h.start));
    }

    const quoteText = maskedText.substring(h.start, Math.min(h.end, maskedText.length));
    const isSelected = activeHighlight?.start === h.start;

    segments.push(
      <button
        key={`hl-${i}`}
        type="button"
        onClick={() => setActiveHighlight(isSelected ? null : h)}
        className={`inline-block cursor-pointer font-semibold transition-all duration-150 px-1.5 py-0.5 rounded-md mx-0.5 text-xs sm:text-sm ${
          isSelected
            ? "border border-risk-high bg-risk-high-tint text-text ring-2 ring-risk-high/30"
            : "border-b-2 border-risk-high bg-risk-high/15 text-risk-high hover:bg-risk-high/25"
        }`}
        title={t("result.anatomy_hint")}
        aria-expanded={isSelected}
        data-testid="highlighted-quote"
      >
        {quoteText}
      </button>
    );

    lastIndex = Math.min(h.end, maskedText.length);
  });

  if (lastIndex < maskedText.length) {
    segments.push(maskedText.substring(lastIndex));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
          <Icon icon="ph:scan" className="text-text-2" />
          <span>{t("result.scam_anatomy")}</span>
        </span>
        <span className="text-xs text-muted flex items-center gap-1">
          <Icon icon="ph:cursor-click" aria-hidden />
          <span>{t("result.anatomy_tap_hint")}</span>
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-bg/90 p-4 sm:p-5 text-sm sm:text-base leading-relaxed text-text font-mono whitespace-pre-wrap shadow-inner">
        {segments}
      </div>

      {activeHighlight && (
        <div
          className="flex items-start gap-3.5 rounded-2xl border border-risk-high/40 bg-gradient-to-r from-risk-high/15 to-surface-2 p-4 text-xs sm:text-sm text-text shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
          role="region"
          aria-live="polite"
          data-testid="anatomy-popover"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-risk-high/20 text-risk-high shrink-0 mt-0.5">
            <Icon icon="ph:warning-octagon" className="text-base" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-risk-high font-mono">
              &quot;{activeHighlight.quote}&quot;
            </span>
            <span className="text-text/90 leading-relaxed">
              {t(`red_flags.${activeHighlight.flag}`, {
                defaultValue: t("result.flag_explanation", { flag: activeHighlight.flag }),
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
