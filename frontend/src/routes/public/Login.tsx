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
          <Link to="/register" className="text-brand hover:underline">
            {t("auth.create_account")}
          </Link>
          <Link
            to="/check"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-text hover:bg-surface"
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
            className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          >
            <Icon icon="ph:info" aria-hidden className="shrink-0 text-brand" />
            {t(NOTICES[noticeKey])}
          </p>
        )}

        {message && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600"
          >
            <p>{message}</p>
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
          errorKey={err?.fields.password}
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
