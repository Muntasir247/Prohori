import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";

export interface PressurePauseProps {
  checkId?: string;
  initialSeconds?: number;
  onFinish?: () => void;
  onSkip?: () => void;
}

export function PressurePause({
  checkId,
  initialSeconds = 10,
  onFinish,
  onSkip,
}: PressurePauseProps) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sendAck = useCallback(
    (outcome: "finished" | "skipped") => {
      if (checkId) {
        void apiFetch(`/checks/${checkId}/pause-ack`, {
          method: "POST",
          body: JSON.stringify({ outcome }),
        }).catch(() => {
          // Silently catch network error - never block the user
        });
      }
    },
    [checkId]
  );

  useEffect(() => {
    if (seconds <= 0) {
      setIsDismissed(true);
      sendAck("finished");
      onFinish?.();
      return;
    }
    const timer = setTimeout(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [seconds, sendAck, onFinish]);

  if (isDismissed) {
    return null;
  }

  const handleSkip = () => {
    setIsDismissed(true);
    sendAck("skipped");
    onSkip?.();
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-surface-2 p-5 text-text shadow-sm"
      role="region"
      aria-label="Pressure Pause"
      data-testid="pressure-pause"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent font-semibold text-sm">
          <Icon icon="ph:pause-circle-bold" className="text-xl" aria-hidden />
          <span>{t("pause.title", "Take a breath")}</span>
        </div>
        <span
          className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-mono font-bold text-accent"
          data-testid="pause-countdown"
          aria-live="polite"
        >
          {seconds}s
        </span>
      </div>

      <p className="text-sm text-text/90 font-medium">
        {t("pause.message", "Take a breath. Scammers want you to rush.")}
      </p>

      <div className="flex items-center justify-between pt-1">
        <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full bg-accent ${
              prefersReducedMotion ? "" : "transition-all duration-1000"
            }`}
            style={{ width: `${(seconds / 10) * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-medium text-muted hover:text-text underline focus:outline-none focus:ring-2 focus:ring-accent rounded px-1.5 py-0.5"
          data-testid="pause-skip-button"
          aria-label={t("pause.skip", "Skip countdown and proceed")}
        >
          {t("pause.skip", "Skip")}
        </button>
      </div>
    </div>
  );
}

export default PressurePause;
