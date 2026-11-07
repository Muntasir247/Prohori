import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { User } from "@/features/auth/api";
import { useLogin } from "@/features/auth/useSession";
import { parseApiError, type ParsedError } from "@/lib/apiError";

function destinationFor(user: User): string {
  if (user.role === "reviewer" || user.role === "admin") return "/review";
  return user.onboarding_completed ? "/check" : "/onboarding";
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<ParsedError | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const user = await login.mutateAsync({ email, password });
      navigate(destinationFor(user), { replace: true });
    } catch (caught) {
      setErr(parseApiError(caught));
    }
  };

  const unverified = err?.messageKey === "errors.email_unverified";

  return (
    <AuthCard
      title={t("auth.login_title")}
      footer={
        <>
          <Link to="/register" className="text-brand hover:underline">
            {t("auth.create_account")}
          </Link>
          {" · "}
          <Link to="/check" className="hover:underline">
            {t("auth.check_without_account")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {err && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600"
          >
            <p>
              {err.messageKey === "errors.invalid_credentials"
                ? t("auth.error_bad_credentials")
                : t(err.messageKey, { seconds: err.retryAfter ?? 900 })}
            </p>
            {unverified && (
              <Link
                to={`/verify-email?email=${encodeURIComponent(email)}`}
                className="mt-1 inline-block font-medium underline"
              >
                {t("auth.resend_verification")}
              </Link>
            )}
          </div>
        )}

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
          autoComplete="current-password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-brand hover:underline">
            {t("auth.forgot_password")}
          </Link>
        </div>

        <Button type="submit" loading={login.isPending}>
          {t("auth.sign_in")}
        </Button>
      </form>
    </AuthCard>
  );
}
