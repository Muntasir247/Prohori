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
  ...rest
}: Props) {
  const { t } = useTranslation();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const effectiveType = showPasswordToggle && reveal ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={effectiveType}
          aria-invalid={errorKey ? true : undefined}
          aria-describedby={errorKey ? `${fieldId}-error` : undefined}
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand aria-[invalid=true]:border-red-500"
          {...rest}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={t(reveal ? "auth.hide_password" : "auth.show_password")}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted"
          >
            <Icon icon={reveal ? "ph:eye-slash" : "ph:eye"} aria-hidden />
          </button>
        )}
      </div>
      {hint && !errorKey && <p className="text-xs text-muted">{hint}</p>}
      {errorKey && (
        <p id={`${fieldId}-error`} className="text-xs text-red-600" role="alert">
          {t(errorKey)}
        </p>
      )}
    </div>
  );
}
