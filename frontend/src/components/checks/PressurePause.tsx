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

  const progressPercent = (seconds / initialSeconds) * 100;

  return (
    <div
      className="rounded-lg border border-border-strong bg-surface p-5 text-text sm:p-6"
      role="region"
      aria-label="Pressure Pause"
      data-testid="pressure-pause"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-pine text-bone">
            <Icon icon="ph:hand-palm" className="text-2xl" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-text">{t("pause.title", "Take a breath")}</h3>
            <p className="mt-0.5 text-[15px] text-text-2">
              {t("pause.subtitle", "Scammers rely on manufactured urgency")}
            </p>
          </div>
        </div>

        <div
          className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-strong px-2 font-mono text-base font-medium tabular-nums text-text"
          data-testid="pause-countdown"
          aria-live="polite"
        >
          {seconds}s
        </div>
      </div>

      <p className="mt-4 text-base font-medium text-text">
        {t("pause.message", "Take a breath. Scammers want you to rush.")}
      </p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div
            className={`h-full origin-left rounded-full bg-bone ${
              prefersReducedMotion ? "" : "transition-transform duration-1000 ease-linear"
            }`}
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-[15px] font-medium text-text-2 underline underline-offset-4 transition-colors duration-[120ms] hover:text-text"
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
