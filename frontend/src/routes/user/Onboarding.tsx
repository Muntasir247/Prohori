import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { authApi } from "@/features/auth/api";
import { clearPendingOnboarding, queueOnboarding } from "@/features/auth/preferences";
import { homeFor, SESSION_KEY, useSession } from "@/features/auth/useSession";
import { withViewTransition } from "@/lib/viewTransition";

type Lang = "bn" | "en";

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useSession();

  const [step, setStep] = useState(1);
  const [lang, setLang] = useState<Lang>(
    (user?.language as Lang) ?? (i18n.language === "en" ? "en" : "bn"),
  );

  const chooseLang = (value: Lang) => {
    withViewTransition(() => {
      setLang(value);
      void i18n.changeLanguage(value);
    });
  };

  const [saving, setSaving] = useState(false);

  // New accounts only (Doc 01 S08): anyone who finished it, or staff, go home.
  if (user && (user.onboarding_completed || user.role !== "user")) {
    return <Navigate to={homeFor(user)} replace />;
  }

  const finish = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updateMe({
        language: lang,
        onboarding_completed: true,
      });
      clearPendingOnboarding();
      qc.setQueryData(SESSION_KEY, updated);
    } catch {
      // Save locally; useSyncLanguage replays it on the next load (Doc 01 S08).
      queueOnboarding({ language: lang });
    } finally {
      setSaving(false);
    }
    navigate("/check", { replace: true });
  };

  const promises = t("onboarding.promises_list", {
    returnObjects: true,
  }) as string[];
  const howto = t("onboarding.howto_list", { returnObjects: true }) as string[];

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={3}
        >
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1.5 w-10 rounded-full ${n <= step ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-sm text-muted hover:text-text"
        >
          {t("onboarding.skip")}
        </button>
      </div>

      {step === 1 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{t("onboarding.lang_title")}</h1>
          <div className="grid grid-cols-2 gap-3">
            {(["bn", "en"] as Lang[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseLang(value)}
                className={`rounded-xl border p-6 text-lg font-medium ${
                  lang === value
                    ? "border-brand ring-1 ring-brand"
                    : "border-border"
                }`}
              >
                {value === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{t("onboarding.howto_title")}</h1>
          <ol className="flex flex-col gap-3">
            {howto.map((line, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-on-accent">
                  {i + 1}
                </span>
                <span className="text-sm">{line}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{t("onboarding.promises_title")}</h1>
          <ul className="flex flex-col gap-2">
            {promises.map((line, i) => (
              <li key={i} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex gap-3">
        {step > 1 && (
          <Button variant="ghost" type="button" onClick={() => setStep((s) => s - 1)}>
            {t("onboarding.back")}
          </Button>
        )}
        {step < 3 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            {t("onboarding.next")}
          </Button>
        ) : (
          <Button type="button" onClick={finish} loading={saving}>
            {t("onboarding.understand_start")}
          </Button>
        )}
      </div>
    </main>
  );
}
