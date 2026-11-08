import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authApi } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import { parseApiError, type ParsedError } from "@/lib/apiError";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

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
      await authApi.resetPassword(token, password);
      // Reset revokes every session (Doc 01 S07): go to login with a toast flag.
      navigate("/login?reset=1", { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 410) {
        setExpired(true);
      } else {
        setErr(parseApiError(caught));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || expired) {
    return (
      <AuthCard title={t("auth.reset_title")}>
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-muted">{t("auth.reset_expired")}</p>
          <Link to="/forgot-password" className="font-semibold text-brand hover:underline">
            {t("auth.request_new_link")}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.reset_title")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {err && (
          <p role="alert" className="rounded-xl border border-risk-high/30 bg-risk-high/10 px-3.5 py-2.5 text-xs font-medium text-risk-high">
            {t(err.messageKey)}
          </p>
        )}
        <TextField
          label={t("auth.new_password")}
          type="password"
          autoComplete="new-password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          errorKey={err?.fields.password}
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
          {t("auth.set_new_password")}
        </Button>
      </form>
    </AuthCard>
  );
}
