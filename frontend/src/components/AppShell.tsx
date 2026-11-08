import { Icon } from "@iconify/react";
import { createContext, type ReactNode, Suspense, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ProhoriLogo } from "@/components/brand/ProhoriLogo";
import { homeFor, useLogout, useSession } from "@/features/auth/useSession";

// True inside ShellLayout. A page's own <AppShell> then renders only its
// children, so the header, nav and footer stay mounted across navigation.
const InShell = createContext(false);

/**
 * Router layout for every screen that uses the app frame. The frame mounts once;
 * only <main> is swapped (keyed by path) so each page fades in and starts at the top.
 */
export function ShellLayout() {
  return (
    <InShell.Provider value={true}>
      <Frame>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </Frame>
    </InShell.Provider>
  );
}

/**
 * Pages wrap themselves in <AppShell>. Under ShellLayout this is a passthrough;
 * rendered on its own (unit tests, isolated previews) it draws the full frame.
 */
export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const inShell = useContext(InShell);
  if (inShell) return <>{children}</>;
  return <Frame wide={wide}>{children}</Frame>;
}

/** Quiet lazy-route fallback: invisible for 150 ms so fast loads never flash. */
function PageFallback() {
  return (
    <div aria-hidden className="flex animate-delayed-in flex-col gap-6">
      <div className="skeleton h-9 w-48" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}

// App frame (Doc 01 §7 Navbar + BottomNav, §5 containers).
// - 64 px sticky header, Surface 1 with a bottom border. No floating glass bar.
// - User flows: 640 px reader column, BottomNav below 1024 px.
// - Reviewer and admin: 1320 px workbench.
function Frame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const { pathname } = useLocation();
  const isWorkbench = wide ?? (pathname.startsWith("/review") || pathname.startsWith("/admin"));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg text-text">
      <a href="#main" className="skip-link">
        {t("a11y.skip_to_content")}
      </a>

      <header className="sticky top-0 z-header border-b border-border bg-surface">
        <div
          className={`mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 md:px-6 lg:px-8 ${
            isWorkbench ? "max-w-[1320px]" : "max-w-[1200px]"
          }`}
        >
          <div className="flex items-center gap-8">
            <Link
              to={user ? homeFor(user) : "/"}
              aria-label={t("app.name")}
              className="inline-flex rounded-md"
            >
              <ProhoriLogo size="sm" />
            </Link>
            {!isWorkbench && <UserNav className="hidden lg:flex" />}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/already-sent"
              className="hidden min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-risk-high transition-colors duration-[120ms] hover:bg-risk-high-tint md:inline-flex"
            >
              <Icon icon="ph:siren" className="text-lg" aria-hidden />
              <span>{t("landing.card_sent_title")}</span>
            </Link>
            <LanguageToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main
        key={pathname}
        id="main"
        tabIndex={-1}
        className={`mx-auto flex w-full flex-1 animate-page-in flex-col gap-8 px-4 py-8 outline-none md:px-6 md:py-10 lg:px-8 ${
          isWorkbench ? "max-w-[1320px]" : "max-w-[640px] pb-28 lg:pb-12"
        }`}
      >
        {children}
      </main>

      <footer className={`border-t border-border ${isWorkbench ? "" : "mb-16 lg:mb-0"}`}>
        <div
          className={`mx-auto flex w-full flex-col items-center justify-between gap-3 px-4 py-5 text-sm sm:flex-row md:px-6 lg:px-8 ${
            isWorkbench ? "max-w-[1320px]" : "max-w-[1200px]"
          }`}
        >
          <p className="text-faint">{t("app.prototype_notice")}</p>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <Link to="/already-sent" className="text-text-2 transition-colors hover:text-text">
              {t("landing.card_sent_title")}
            </Link>
            <Link to="/check/message" className="text-text-2 transition-colors hover:text-text">
              {t("check.card_message_title")}
            </Link>
          </nav>
        </div>
      </footer>

      {!isWorkbench && <BottomNav />}
    </div>
  );
}

const USER_NAV = [
  { to: "/check", key: "nav.check", icon: "ph:chat-text" },
  { to: "/history", key: "nav.history", icon: "ph:clock-counter-clockwise" },
  { to: "/already-sent", key: "nav.already_sent", icon: "ph:siren" },
  { to: "/settings", key: "nav.settings", icon: "ph:gear-six" },
] as const;

function UserNav({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.main")} className={`items-center gap-1 ${className}`}>
      {USER_NAV.filter((i) => i.to !== "/already-sent").map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `relative inline-flex h-16 items-center gap-2 px-3 text-[15px] font-medium transition-colors duration-[120ms] ${
              isActive
                ? "text-text after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent"
                : "text-text-2 hover:text-text"
            }`
          }
        >
          <Icon icon={item.icon} className="text-xl" aria-hidden />
          {t(item.key)}
        </NavLink>
      ))}
    </nav>
  );
}

function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-sidebar border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-[640px] grid-cols-4">
        {USER_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `relative flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-[120ms] ${
                  isActive
                    ? "text-text before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-accent"
                    : item.to === "/already-sent"
                      ? "text-risk-high"
                      : "text-text-2 hover:text-text"
                }`
              }
            >
              <Icon icon={item.icon} className="text-2xl" aria-hidden />
              <span className="max-w-full truncate px-1">{t(item.key)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
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
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      ) {
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
        className="inline-flex min-h-11 items-center rounded-md border border-border px-3.5 text-sm font-semibold text-text transition-colors duration-[120ms] hover:border-border-strong hover:bg-surface-2"
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

  const item =
    "flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm text-text transition-colors duration-[120ms] hover:bg-surface-2";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-text transition-colors duration-[120ms] hover:bg-surface-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pine text-sm font-semibold text-bone">
          {user.display_name ? user.display_name[0].toUpperCase() : "U"}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{user.display_name || user.email}</span>
        <Icon
          icon="ph:caret-down"
          className={`text-sm text-text-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-dropdown mt-2 w-60 origin-top-right animate-pop-in rounded-lg border border-border bg-surface p-1.5 shadow-modal"
        >
          <div className="mb-1 border-b border-border px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-text">{user.display_name}</p>
            <p className="truncate text-xs text-text-2">{user.email}</p>
            <span className="mt-2 inline-block rounded-sm border border-border px-1.5 py-0.5 text-xs font-medium capitalize text-text-2">
              {user.role}
            </span>
          </div>

          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className={item}>
            <Icon icon="ph:gear-six" className="text-lg text-text-2" aria-hidden />
            <span>{t("settings.title")}</span>
          </Link>

          {(user.role === "reviewer" || user.role === "admin") && (
            <Link role="menuitem" to="/review" onClick={() => setOpen(false)} className={item}>
              <Icon icon="ph:tray" className="text-lg text-text-2" aria-hidden />
              <span>{t("review.workbench_nav")}</span>
            </Link>
          )}

          {user.role === "admin" && (
            <Link role="menuitem" to="/admin" onClick={() => setOpen(false)} className={item}>
              <Icon icon="ph:books" className="text-lg text-text-2" aria-hidden />
              <span>{t("admin.nav_knowledge")}</span>
            </Link>
          )}

          <div className="my-1 border-t border-border" />

          <button
            role="menuitem"
            type="button"
            onClick={signOut}
            className={`${item} w-full text-risk-high hover:bg-risk-high-tint`}
          >
            <Icon icon="ph:sign-out" className="text-lg" aria-hidden />
            <span>{t("auth.sign_out")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
