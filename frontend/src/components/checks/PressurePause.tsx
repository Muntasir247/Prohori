import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface PressurePauseProps {
  onFinish?: () => void;
  onSkip?: () => void;
}

export function PressurePause({ onFinish, onSkip }: PressurePauseProps) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(10);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (seconds <= 0) {
      setIsDismissed(true);
      onFinish?.();
      return;
    }
    const timer = setTimeout(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [seconds, onFinish]);

  if (isDismissed) {
    return null;
  }

  const handleSkip = () => {
    setIsDismissed(true);
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
          <span>{t("pause.title")}</span>
        </div>
        <span
          className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-mono font-bold text-accent"
          data-testid="pause-countdown"
        >
          {seconds}s
        </span>
      </div>

      <p className="text-sm text-text/90 font-medium">
        {t("pause.message")}
      </p>

      <div className="flex items-center justify-between pt-1">
        <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-accent transition-all duration-1000"
            style={{ width: `${(seconds / 10) * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-medium text-muted hover:text-text underline focus:outline-none focus:ring-1 focus:ring-accent"
          data-testid="pause-skip-button"
        >
          {t("pause.skip")}
        </button>
      </div>
    </div>
  );
}
