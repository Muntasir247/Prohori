import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface PipelineStepsProps {
  onTimeout?: () => void;
}

export function PipelineSteps({ onTimeout }: PipelineStepsProps) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Advance steps on timer
    if (elapsed >= 1 && activeStep === 0) setActiveStep(1);
    if (elapsed >= 3 && activeStep === 1) setActiveStep(2);
    if (elapsed >= 5 && activeStep === 2) setActiveStep(3);
    if (elapsed >= 15 && onTimeout) {
      onTimeout();
    }
  }, [elapsed, activeStep, onTimeout]);

  const steps = [
    t("checking.step_hide_pii"),
    t("checking.step_rules"),
    t("checking.step_compare"),
    t("checking.step_generate"),
  ];

  return (
    <div
      className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      aria-live="polite"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">{t("checking.title")}</h2>
        <p className="text-sm text-muted">{t("checking.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {steps.map((label, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isDone
                    ? "bg-accent text-on-accent"
                    : isCurrent
                      ? "border-2 border-brand bg-brand/10 text-brand"
                      : "border border-border text-muted"
                }`}
              >
                {isDone ? (
                  <Icon icon="ph:check" className="text-base" aria-hidden />
                ) : isCurrent ? (
                  <Icon icon="ph:spinner" className="animate-spin text-base" aria-hidden />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-text font-medium"
                    : isCurrent
                      ? "text-brand font-semibold"
                      : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {elapsed >= 10 && (
        <p className="flex items-center gap-2 text-xs text-risk-medium font-medium">
          <Icon icon="ph:hourglass" aria-hidden />
          {t("checking.taking_longer")}
        </p>
      )}
    </div>
  );
}
