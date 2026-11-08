import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authApi } from "@/features/auth/api";
import { parseApiError, type ParsedError } from "@/lib/apiError";

const MIN_PASSWORD = 10;

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<ParsedError | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setConsentError(false);
    if (!consent) {
      setConsentError(true);
      return;
    }
    setSubmitting(true);
    try {
      await authApi.register({
        name,
        email,
        password,
        language: i18n.language === "en" ? "en" : "bn",
        consent,
      });
      navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
        replace: true,
      });
    } catch (caught) {
      setErr(parseApiError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const strength =
    password.length === 0
      ? ""
      : password.length < MIN_PASSWORD
        ? t("auth.password_hint_short", { min: MIN_PASSWORD })
        : t("auth.password_hint_ok");

  return (
    <AuthCard
      title={t("auth.register_title")}
      subtitle={t("auth.no_account_needed")}
      footer={
        <Link to="/login" className="text-xs font-semibold text-brand hover:underline">
          {t("auth.have_account")}
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {err && (
          <p
            role="alert"
            className="rounded-xl border border-risk-high/30 bg-risk-high/10 px-3.5 py-2.5 text-xs font-medium text-risk-high"
          >
            {t(err.messageKey, { seconds: err.retryAfter ?? 3600 })}
          </p>
        )}

        <TextField
          label={t("auth.name")}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          errorKey={err?.fields.name}
          minLength={2}
          maxLength={80}
          required
        />
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errorKey={err?.fields.email}
          required
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errorKey={err?.fields.password}
          hint={strength}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-surface-2/30 p-3 text-xs leading-relaxed text-muted transition-colors hover:border-border cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-brand"
            />
            <span>
              {t("auth.consent_label")}{" "}
              <Link to="/safety" className="font-semibold text-brand hover:underline">
                {t("auth.privacy_note")}
              </Link>
            </span>
          </label>
          {consentError && (
            <p className="flex items-center gap-1 text-xs font-medium text-risk-high" role="alert">
              <span>{t("errors.field.required")}</span>
            </p>
          )}
        </div>

        <Button type="submit" loading={submitting} className="mt-1">
          {t("auth.create_account")}
        </Button>
      </form>
    </AuthCard>
  );
}
