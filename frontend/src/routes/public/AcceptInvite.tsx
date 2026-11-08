import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authApi } from "@/features/auth/api";
import { parseApiError, type ParsedError } from "@/lib/apiError";

const MIN_PASSWORD = 10;

// Reviewer setup from an invite link (POST /api/v1/auth/accept-invite).
// Reviewer accounts are invite-only (Doc 01 S04); an invite expires in 48 h.
export default function AcceptInvite() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [err, setErr] = useState<ParsedError | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMismatch(false);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setSubmitting(true);
    try {
      await authApi.acceptInvite(token, name, password);
      navigate("/login?invited=1", { replace: true });
    } catch (caught) {
      const parsed = parseApiError(caught);
      if (parsed.status === 410) setExpired(true);
      else setErr(parsed);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || expired) {
    return (
      <AuthCard title={t("invite.title")}>
        <p className="text-sm text-text-2 leading-relaxed">{t("invite.expired")}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("invite.title")}
      subtitle={t("invite.subtitle")}
      footer={
        <Link to="/login" className="text-xs font-semibold text-brand hover:underline">
          {t("auth.back_to_login")}
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {err && Object.keys(err.fields).length === 0 && (
          <p role="alert" className="rounded-xl border border-risk-high/30 bg-risk-high/10 px-3.5 py-2.5 text-xs font-medium text-risk-high">
            {t(err.messageKey)}
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
          label={t("auth.new_password")}
          type="password"
          autoComplete="new-password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errorKey={err?.fields.password}
          hint={
            password && password.length < MIN_PASSWORD
              ? t("auth.password_hint_short", { min: MIN_PASSWORD })
              : undefined
          }
          required
        />
        <TextField
          label={t("auth.confirm_password")}
          type="password"
          autoComplete="new-password"
          showPasswordToggle
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          errorKey={mismatch ? "errors.field.mismatch" : undefined}
          required
        />
        <Button type="submit" loading={submitting} className="mt-1">
          {t("invite.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
