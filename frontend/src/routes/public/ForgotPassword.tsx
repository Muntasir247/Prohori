import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authApi } from "@/features/auth/api";
import { parseApiError } from "@/lib/apiError";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      // Always the same outcome, whether or not the email exists (no discovery).
      setSent(true);
    } catch (caught) {
      const parsed = parseApiError(caught);
      setError(t(parsed.messageKey, { seconds: parsed.retryAfter ?? 3600 }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.forgot_title")}
      footer={
        <Link to="/login" className="text-xs font-semibold text-brand hover:underline">
          {t("auth.back_to_login")}
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4 text-xs leading-relaxed text-muted">
          <p className="font-medium text-text">{t("auth.forgot_sent")}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && (
            <p role="alert" className="rounded-xl border border-risk-high/30 bg-risk-high/10 px-3.5 py-2.5 text-xs font-medium text-risk-high">
              {error}
            </p>
          )}
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" loading={submitting} className="mt-1">
            {t("auth.send_reset_link")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
