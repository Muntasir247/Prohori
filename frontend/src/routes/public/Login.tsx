import { Icon } from "@iconify/react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { User } from "@/features/auth/api";
import { homeFor, useLogin, useSession } from "@/features/auth/useSession";
import { parseApiError, type ParsedError, waitText } from "@/lib/apiError";

// Notices other screens hand to S03 through the query string.
const NOTICES = {
  reset: "auth.notice_reset",
  verified: "auth.notice_verified",
  invited: "auth.notice_invited",
} as const;

/** Only same-app paths, never `//host` or absolute URLs (open-redirect safe). */
function safeFrom(from: unknown): string | null {
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : null;
}

function destinationFor(user: User, from: string | null): string {
  const home = homeFor(user);
  // Unfinished onboarding always comes first for new users (Doc 01 S03).
  if (home === "/onboarding" || !from) return home;
  return from;
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { data: session } = useSession();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<ParsedError | null>(null);

  const from = safeFrom((location.state as { from?: unknown } | null)?.from);
  const noticeKey = (Object.keys(NOTICES) as Array<keyof typeof NOTICES>).find(
    (k) => params.get(k) === "1",
  );

  if (session && !login.isPending) {
    return <Navigate to={destinationFor(session, from)} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const user = await login.mutateAsync({ email, password });
      navigate(destinationFor(user, from), { replace: true });
    } catch (caught) {
      setErr(parseApiError(caught));
    }
  };

  const unverified = err?.code === "email_unverified";
  const hasFieldErrors = err ? Object.keys(err.fields).length > 0 : false;

  let message: string | null = null;
  if (err && !hasFieldErrors) {
    message =
      err.status === 429
        ? t("errors.login_locked", { wait: waitText(err.retryAfter) })
        : err.code === "invalid_credentials"
          ? t("auth.error_bad_credentials")
          : t(err.messageKey);
  }

  return (
    <AuthCard
      title={t("auth.login_title")}
      footer={
        <div className="flex flex-col items-center gap-3">
          <Link to="/register" className="text-xs font-semibold text-brand hover:underline">
            {t("auth.create_account")}
          </Link>
          <Link
            to="/check"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border/80 bg-surface/40 px-4 text-xs font-semibold text-text transition-all hover:bg-surface hover:border-border hover:shadow-sm"
          >
            {t("auth.check_without_account")}
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {noticeKey && !err && (
          <p
            role="status"
            className="flex items-center gap-2.5 rounded-xl border border-brand/30 bg-brand/10 px-3.5 py-2.5 text-xs text-brand font-medium"
          >
            <Icon icon="ph:info" aria-hidden className="shrink-0 text-base text-brand" />
            <span>{t(NOTICES[noticeKey])}</span>
          </p>
        )}

        {message && (
          <div
            role="alert"
            className="rounded-xl border border-risk-high/30 bg-risk-high/10 px-3.5 py-2.5 text-xs text-risk-high leading-relaxed"
          >
            <p className="font-medium">{message}</p>
            {unverified && (
              <Link
                to={`/verify-email?email=${encodeURIComponent(email)}`}
                className="mt-1.5 inline-block font-bold underline"
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
          errorKey={err?.fields.password}
          required
        />

        <div className="flex items-center justify-end text-xs">
          <Link to="/forgot-password" className="text-muted hover:text-text hover:underline transition-colors font-medium">
            {t("auth.forgot_password")}
          </Link>
        </div>

        <Button type="submit" loading={login.isPending} className="mt-1">
          {t("auth.sign_in")}
        </Button>
      </form>
    </AuthCard>
  );
}
