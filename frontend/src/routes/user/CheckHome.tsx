import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";

// S09 Check home (/check). Open to guests and users. The message and payment
// checks are built on the Phase 05–07 pipeline; until then this screen is the
// signed-in landing and says plainly that checking is not available yet.
export default function CheckHome() {
  const { t } = useTranslation();
  const { data: user } = useSession();
  useSyncLanguage(user);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">
        {user ? t("check.greeting", { name: user.display_name }) : t("check.title")}
      </h1>
      <section className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">{t("check.not_ready")}</p>
      </section>
    </AppShell>
  );
}
