import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/features/auth/api";
import { parseApiError, waitText } from "@/lib/apiError";

type Status = "idle" | "verifying" | "confirmed" | "expired" | "waiting";

// A verification token is single-use. React may run the effect twice (StrictMode
// in development, or a remount), and a second POST would get 410 and wrongly
// show "expired" after the first one succeeded. Share one request per token.
const verifyRequests = new Map<string, Promise<void>>();

function verifyOnce(token: string): Promise<void> {
  let request = verifyRequests.get(token);
  if (!request) {
    request = authApi.verifyEmail(token).then(() => undefined);
    verifyRequests.set(token, request);
  }
  return request;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export default function VerifyEmail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const email = params.get("email") ?? "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
  const [cooldown, setCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        await verifyOnce(token);
        if (!active) return;
        setStatus("confirmed");
        // Verifying does not sign the visitor in (an emailed link must not act
        // as a login credential). Sign-in then lands new users on S08.
        setTimeout(() => navigate("/login?verified=1", { replace: true }), 1200);
      } catch {
        if (active) setStatus("expired");
      }
    })();
    return () => {
      active = false;
    };
  }, [token, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const resend = async () => {
    setResendError(null);
    try {
      await authApi.resendVerification(email);
      setCooldown(60);
      setStatus("waiting");
    } catch (caught) {
      const parsed = parseApiError(caught);
      if (parsed.status === 429) {
        // 3 per hour (Doc 01 S05): show how long until the next one is allowed.
        setCooldown(parsed.retryAfter ?? 3600);
        setResendError(t("auth.resend_limited", { wait: waitText(parsed.retryAfter) }));
      } else {
        setResendError(t(parsed.messageKey));
      }
    }
  };

  return (
    <AuthCard
      title={t("auth.verify_title")}
      footer={
        <Link to="/login" className="text-brand hover:underline">
          {t("auth.back_to_login")}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Icon
          icon={status === "confirmed" ? "ph:check-circle" : "ph:envelope-simple"}
          className={`text-4xl ${status === "confirmed" ? "text-brand" : "text-muted"}`}
          aria-hidden
        />

        {status === "verifying" && <p className="text-sm">{t("auth.verifying")}</p>}

        {status === "confirmed" && (
          <p className="font-medium text-brand">{t("auth.email_confirmed")}</p>
        )}

        {(status === "waiting" || status === "expired") && (
          <div className="flex w-full flex-col gap-3">
            <p className="text-sm text-muted">
              {status === "expired"
                ? t("auth.verify_expired")
                : t("auth.verify_instruction")}
            </p>
            {email && (
              <p className="text-sm font-medium" data-testid="masked-email">
                {maskEmail(email)}
              </p>
            )}
            {resendError && (
              <p className="text-xs text-red-600" role="alert">
                {resendError}
              </p>
            )}
            {email && (
              <Button
                variant="ghost"
                onClick={resend}
                disabled={cooldown > 0}
                type="button"
              >
                {cooldown > 0
                  ? t("auth.resend_in", { wait: waitText(cooldown) })
                  : t("auth.resend_verification")}
              </Button>
            )}
          </div>
        )}
      </div>
    </AuthCard>
  );
}
