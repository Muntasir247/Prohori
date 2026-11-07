import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { LanguageToggle } from "@/components/LanguageToggle";

// Centered card shell used by the auth screens (Doc 01 S03–S07). Logo above,
// no split hero, 420 px max width, full-width with a 16 px gutter on mobile.
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="mb-4 flex w-full max-w-[420px] items-center justify-between">
        <span className="text-lg font-semibold text-brand">{t("app.name")}</span>
        <LanguageToggle />
      </div>
      <section className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        <div className="mt-5">{children}</div>
      </section>
      {footer && (
        <div className="mt-4 w-full max-w-[420px] text-center text-sm text-muted">
          {footer}
        </div>
      )}
    </main>
  );
}
