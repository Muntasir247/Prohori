import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/features/auth/useSession";

// S24 Review Overview (/review) — the reviewer and admin landing. Loaded lazily
// so reviewer code never ships to guests (Doc 02 Section 6). The queue, case
// detail and analytics land in Phases 08–09; this screen confirms the reviewer
// session and its short lifetime.
export default function ReviewOverview() {
  const { t } = useTranslation();
  const { data: user } = useSession();
  if (!user) return null;

  return (
    <AppShell wide>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("review.title")}</h1>
        <p className="text-sm text-muted">
          {t("review.signed_in_as", {
            name: user.display_name,
            role: t(`roles.${user.role}`),
          })}
        </p>
      </header>
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 text-sm">
        <p>{t("review.session_note")}</p>
        <p className="text-muted">{t("review.not_ready")}</p>
        <Link to="/settings" className="self-start text-brand hover:underline">
          {t("review.manage_sessions")}
        </Link>
      </section>
    </AppShell>
  );
}
