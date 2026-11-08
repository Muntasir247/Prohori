import { Icon } from "@iconify/react";
import { type InputHTMLAttributes, useId, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** i18n key for an inline error, or undefined when the field is valid. */
  errorKey?: string;
  showPasswordToggle?: boolean;
  hint?: string;
}

export function TextField({
  label,
  errorKey,
  showPasswordToggle = false,
  hint,
  type = "text",
  id,
  className = "",
  ...rest
}: Props) {
  const { t } = useTranslation();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const effectiveType = showPasswordToggle && reveal ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={fieldId} className="text-sm font-semibold text-text">
          {label}
        </label>
        {hint && !errorKey && <span id={`${fieldId}-hint`} className="text-xs text-text-2">{hint}</span>}
      </div>
      <div className="relative">
        <input
          id={fieldId}
          type={effectiveType}
          aria-invalid={errorKey ? true : undefined}
          aria-describedby={errorKey ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={`min-h-12 w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-faint transition-colors duration-[120ms] hover:border-border-strong focus-visible:border-focus aria-[invalid=true]:border-risk-high ${showPasswordToggle ? "pr-12" : ""} ${className}`}
          {...rest}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={t(reveal ? "auth.hide_password" : "auth.show_password")}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-2 transition-colors hover:text-text"
          >
            <Icon icon={reveal ? "ph:eye-slash" : "ph:eye"} className="text-xl" aria-hidden />
          </button>
        )}
      </div>
      {errorKey && (
        <p id={`${fieldId}-error`} className="flex items-start gap-1.5 text-sm font-medium text-risk-high" role="alert">
          <Icon icon="ph:x-circle" className="mt-0.5 shrink-0 text-base" aria-hidden />
          <span>{t(errorKey)}</span>
        </p>
      )}
    </div>
  );
}
