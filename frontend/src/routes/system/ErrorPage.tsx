import { Icon } from "@iconify/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

import { useInShell } from "@/components/shellContext";
import { ProhoriLogo } from "@/components/brand/ProhoriLogo";

export type ErrorCode = 403 | 404 | 500;

export interface ErrorPageProps {
  code: ErrorCode;
  referenceId?: string;
}

/**
 * Unified error screen (Doc 01 S36):
 * 404, 403, and 500 in one centered Night Watch card.
 * Always keeps "Go home", a reference ID on 500, and the safety helpline link.
 * When rendered inside ShellLayout (e.g. from RequireRole), omits the duplicate
 * brand header and renders a <section> instead of a nested <main>.
 */
export function ErrorPage({ code, referenceId }: ErrorPageProps) {
  const { t } = useTranslation();
  const inShell = useInShell();

  const generatedRef = useMemo(() => {
    if (referenceId) return referenceId;
    if (code !== 500) return undefined;
    return `ERR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }, [code, referenceId]);

  const icon =
    code === 403
      ? "ph:lock-simple"
      : code === 404
        ? "ph:compass"
        : "ph:warning-octagon";

  const cardBody = (
    <>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-border-strong bg-surface-2 text-2xl text-accent">
        <Icon icon={icon} aria-hidden />
      </div>

      <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-text-2">
        {code}
      </p>

      <h1 id={`error-heading-${code}`} className="mt-1 font-display text-2xl font-bold text-text">
        {t(`error_pages.title_${code}`)}
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-text-2">
        {t(`error_pages.body_${code}`)}
      </p>

      {code === 500 && generatedRef && (
        <p
          className="mt-4 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text-2"
          data-testid="error-reference-id"
        >
          {t("error_pages.reference_label")}: <strong className="text-text">{generatedRef}</strong>
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Link
          to="/"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          data-testid="error-go-home"
        >
          <Icon icon="ph:house" className="text-lg" aria-hidden />
          <span>{t("error_pages.go_home")}</span>
        </Link>

        <Link
          to="/already-sent"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-risk-high/40 bg-risk-high-tint px-4 text-sm font-semibold text-risk-high transition-colors hover:border-risk-high"
          data-testid="error-helpline-link"
        >
          <Icon icon="ph:phone-call" className="text-lg" aria-hidden />
          <span>{t("error_pages.stop_and_call")}</span>
        </Link>
      </div>
    </>
  );

  if (inShell) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <section
          aria-labelledby={`error-heading-${code}`}
          className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center sm:p-8"
          data-testid={`error-page-${code}`}
        >
          {cardBody}
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-4 py-12 text-text">
      <div className="mb-6">
        <Link to="/" aria-label={t("app.name")} className="inline-flex rounded-md">
          <ProhoriLogo size="sm" />
        </Link>
      </div>

      <main
        className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center sm:p-8"
        data-testid={`error-page-${code}`}
      >
        {cardBody}
      </main>
    </div>
  );
}

/** React Router errorElement catching unexpected runtime or route errors (S36). */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <ErrorPage code={404} />;
    if (error.status === 403) return <ErrorPage code={403} />;
  }
  return <ErrorPage code={500} />;
}

export default ErrorPage;
