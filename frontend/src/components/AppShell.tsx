import { Icon } from "@iconify/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { LanguageToggle } from "@/components/LanguageToggle";
import { homeFor, useLogout, useSession } from "@/features/auth/useSession";

// Page shell for signed-in and guest app screens: logo, language switch and the
// account menu (Doc 01 S22: "Logout … in the account menu").
export function AppShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  const { data: user } = useSession();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div
          className={`mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 ${
            wide ? "max-w-6xl" : "max-w-3xl"
          }`}
        >
          <Link
            to={user ? homeFor(user) : "/"}
            className="text-lg font-semibold text-brand"
          >
            {t("app.name")}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <AccountMenu />
          </div>
        </div>
      </header>
      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 ${
          wide ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export function AccountMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-md px-2 py-1 text-sm font-medium text-brand hover:underline"
      >
        {t("auth.sign_in")}
      </Link>
    );
  }

  const signOut = async () => {
    setOpen(false);
    await logout.mutateAsync().catch(() => undefined);
    navigate("/", { replace: true });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 items-center gap-1.5 rounded-md border border-border px-2 text-sm"
      >
        <Icon icon="ph:user-circle" aria-hidden className="text-lg" />
        <span className="max-w-[9rem] truncate">{user.display_name}</span>
        <Icon icon="ph:caret-down" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-xs text-muted">
            {user.email} · {t(`roles.${user.role}`)}
          </p>
          <Link
            role="menuitem"
            to="/settings"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm hover:bg-bg"
          >
            {t("settings.title")}
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={signOut}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-bg"
          >
            {t("settings.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
