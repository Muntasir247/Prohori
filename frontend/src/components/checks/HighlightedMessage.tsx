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
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm leading-relaxed text-text font-mono whitespace-pre-wrap">
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
        className={`inline cursor-pointer border-b-2 font-semibold transition-colors px-1 py-0.5 rounded ${
          isSelected
            ? "border-accent bg-accent/20 text-accent ring-1 ring-accent"
            : "border-risk-high bg-risk-high/15 text-risk-high hover:bg-risk-high/25"
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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("result.scam_anatomy")}
        </span>
        <span className="text-xs text-muted flex items-center gap-1">
          <Icon icon="ph:cursor-click" aria-hidden />
          {t("result.anatomy_tap_hint")}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm leading-relaxed text-text font-mono whitespace-pre-wrap">
        {segments}
      </div>

      {activeHighlight && (
        <div
          className="flex items-start gap-3 rounded-xl border border-risk-high/30 bg-risk-high-tint p-3 text-xs text-text animate-fadeIn"
          role="region"
          aria-live="polite"
          data-testid="anatomy-popover"
        >
          <Icon icon="ph:info-fill" className="text-base text-risk-high shrink-0 mt-0.5" aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="font-bold text-risk-high">
              &quot;{activeHighlight.quote}&quot;
            </span>
            <span className="text-text/90">
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

