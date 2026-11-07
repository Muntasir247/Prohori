import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { checksApi } from "@/features/checks/api";
import type { SampleItem } from "@/features/checks/types";

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const isBn = i18n.language === "bn";

  useEffect(() => {
    checksApi.getSamples().then(setSamples).catch(() => setSamples([]));
  }, []);

  const handleSelectSample = (sample: SampleItem) => {
    navigate("/check/message", { state: { prefilledText: sample.body, isSample: true } });
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-brand">
            <Icon icon="ph:shield-check-bold" className="text-2xl text-accent" />
            <span>{t("app.name")}</span>
          </Link>

          <nav className="flex items-center gap-4">
            <LanguageToggle />
            <Link
              to="/login"
              className="hidden sm:inline-flex text-xs font-semibold text-text hover:text-accent transition-colors"
            >
              {t("landing.sign_in")}
            </Link>
            <Link
              to="/check/message"
              className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-bg transition-transform active:scale-95 hover:bg-accent/90"
              data-testid="landing-check-button"
            >
              {t("landing.hero_check_message")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16 flex flex-col gap-12">
        <section className="flex flex-col items-center text-center gap-4">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
            {t("landing.eyebrow")}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-text max-w-2xl">
            {t("landing.hero_h1")}
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-xl">
            {t("landing.hero_subtitle")}
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/check/message"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-bg shadow hover:bg-accent/90 transition-transform active:scale-95"
              data-testid="hero-primary-cta"
            >
              {t("landing.hero_check_message")}
            </Link>
            <Link
              to="/check/payment"
              className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-text hover:bg-surface-2 transition-colors"
              data-testid="hero-secondary-cta"
            >
              {t("landing.hero_check_payment")}
            </Link>
          </div>
        </section>

        {/* Try a Sample Chips (F35) */}
        {samples.length > 0 && (
          <section className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t("landing.sample_chips_label")}
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {samples.slice(0, 4).map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-text hover:border-accent hover:text-accent transition-colors"
                  data-testid="landing-sample-chip"
                >
                  <span className="mr-1.5 text-accent font-bold">✨</span>
                  {isBn ? sample.label_bn : sample.label_en}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Action Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/check/message"
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 hover:border-brand transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand text-xl">
              <Icon icon="ph:chat-text-bold" />
            </div>
            <h3 className="font-bold text-base text-text">{t("landing.card_message_title")}</h3>
            <p className="text-xs text-muted leading-relaxed">{t("landing.card_message_desc")}</p>
          </Link>

          <Link
            to="/check/payment"
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 hover:border-brand transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand text-xl">
              <Icon icon="ph:paper-plane-tilt-bold" />
            </div>
            <h3 className="font-bold text-base text-text">{t("landing.card_payment_title")}</h3>
            <p className="text-xs text-muted leading-relaxed">{t("landing.card_payment_desc")}</p>
          </Link>

          <div
            className="flex flex-col gap-2 rounded-2xl border border-risk-high/40 bg-surface p-5 hover:border-risk-high transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-risk-high/10 text-risk-high text-xl">
              <Icon icon="ph:siren-bold" />
            </div>
            <h3 className="font-bold text-base text-risk-high">{t("landing.card_sent_title")}</h3>
            <p className="text-xs text-muted leading-relaxed">{t("landing.card_sent_desc")}</p>
          </div>
        </section>

        {/* Four Safety Promises */}
        <section className="rounded-2xl border border-border bg-surface p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text">{t("landing.promises_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <Icon icon="ph:lock-key-bold" className="text-brand text-base shrink-0 mt-0.5" />
              <div>
                <strong className="block text-text font-semibold">{t("landing.promise_pii_title")}</strong>
                <span className="text-muted">{t("landing.promise_pii_desc")}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Icon icon="ph:shield-warning-bold" className="text-brand text-base shrink-0 mt-0.5" />
              <div>
                <strong className="block text-text font-semibold">{t("landing.promise_risk_title")}</strong>
                <span className="text-muted">{t("landing.promise_risk_desc")}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Icon icon="ph:phone-call-bold" className="text-brand text-base shrink-0 mt-0.5" />
              <div>
                <strong className="block text-text font-semibold">{t("landing.promise_helpline_title")}</strong>
                <span className="text-muted">{t("landing.promise_helpline_desc")}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Icon icon="ph:users-three-bold" className="text-brand text-base shrink-0 mt-0.5" />
              <div>
                <strong className="block text-text font-semibold">{t("landing.promise_review_title")}</strong>
                <span className="text-muted">{t("landing.promise_review_desc")}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8 text-center text-xs text-muted">
        <p>© 2026 {t("app.name")}. {t("landing.footer_simulated_notice")}</p>
      </footer>
    </div>
  );
}
