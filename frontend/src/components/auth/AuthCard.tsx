import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ProhoriLogo } from "@/components/brand/ProhoriLogo";

// Centred single-column shell for the auth screens (Doc 01 S03–S07).
// Flat surface + 1 px border, no glow (Doc 01 §5).
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <a href="#main" className="skip-link">
        {t("a11y.skip_to_content", "Skip to content")}
      </a>
      <header className="mx-auto flex w-full max-w-[440px] items-center justify-between px-4 pt-6">
        <Link to="/" aria-label={t("app.name")} className="inline-flex rounded-md">
          <ProhoriLogo size="sm" />
        </Link>
        <LanguageToggle />
      </header>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <section className="w-full max-w-[440px] animate-fade-up rounded-lg border border-border bg-surface p-6 shadow-md sm:p-8">
          <h1 className="text-[28px] font-bold leading-tight text-text">{title}</h1>
          {subtitle && <div className="mt-2 max-w-prose text-[15px] text-text-2">{subtitle}</div>}
          <div className="mt-6">{children}</div>
        </section>

        {footer && (
          <div className="mt-6 w-full max-w-[440px] text-center text-sm text-text-2">{footer}</div>
        )}
      </main>

      <footer className="pb-6 text-center text-xs text-faint">
        {t("app.prototype_notice", "Prototype. Uses simulated data.")}
      </footer>
    </div>
  );
}
