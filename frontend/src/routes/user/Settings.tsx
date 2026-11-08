import { Icon } from "@iconify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authApi } from "@/features/auth/api";
import {
  applyTheme,
  getReadAloudDefault,
  getTextSize,
  setReadAloudDefault,
  setTextSize,
  type TextSize,
} from "@/features/auth/preferences";
import { SESSION_KEY, useLogout, useSession, useSignedOut } from "@/features/auth/useSession";
import { ApiError } from "@/lib/api";
import { parseApiError, type ParsedError } from "@/lib/apiError";
import { formatDate } from "@/lib/format";
import { vtName, withViewTransition } from "@/lib/viewTransition";

type Tab = "profile" | "preferences" | "security" | "data";
const TABS: Array<{ id: Tab; icon: string }> = [
  { id: "profile", icon: "ph:user-circle" },
  { id: "preferences", icon: "ph:sliders-horizontal" },
  { id: "security", icon: "ph:lock-key" },
  { id: "data", icon: "ph:database" },
];

// S22 Settings (Doc 01): Profile, Preferences, Security, Your data.
// Reader column, underline tabs, grouped list cards. Lantern only on the one
// primary action of each panel.
export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user, isLoading } = useSession();
  const logout = useLogout();
  // Show the skeleton only for the very first session load. A later refetch
  // must never swap the page out, or the open tab would unmount mid-use.
  const settled = useRef(false);
  if (!isLoading) settled.current = true;
  const { i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("profile");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // One underline that slides between tabs. Measured from the active tab, so it
  // follows label width (Bangla and English differ) and window resizes.
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const [indicatorReady, setIndicatorReady] = useState(false);
  const activeIndex = TABS.findIndex((x) => x.id === tab);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeIndex];
      if (el) setIndicator({ x: el.offsetLeft + 8, w: el.offsetWidth - 16 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex, i18n.language, isLoading]);

  // Enable the slide only after the first placement has been committed (layout
  // effect above), so the underline never sweeps in from the left edge.
  useEffect(() => {
    if (indicator && !indicatorReady) setIndicatorReady(true);
  }, [indicator, indicatorReady]);

  const selectTab = (next: Tab, index: number) => {
    setTab(next);
    tabRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  };

  const onLogout = async () => {
    await logout.mutateAsync().catch(() => undefined);
    navigate("/", { replace: true });
  };

  // WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    selectTab(TABS[next].id, next);
    tabRefs.current[next]?.focus();
  };

  if (isLoading && !settled.current) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6" aria-busy="true">
          <span className="sr-only" role="status">{t("settings.loading")}</span>
          <div className="h-9 w-40 animate-shimmer rounded-md bg-gradient-to-r from-surface via-surface-2 to-surface bg-[length:200%_100%]" />
          <div className="h-12 w-full rounded-md border-b border-border" />
          <div className="h-56 w-full animate-shimmer rounded-lg bg-gradient-to-r from-surface via-surface-2 to-surface bg-[length:200%_100%]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex flex-col gap-2">
        <h1 className="text-text">{t("settings.title")}</h1>
        <p className="text-base text-text-2">{t("settings.subtitle")}</p>
      </header>

      {user && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-pine text-lg font-semibold text-bone"
          >
            {(user.display_name || user.email || "U")[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-text">{user.display_name}</p>
            <p className="truncate text-sm text-text-2">{user.email}</p>
          </div>
          {user.role !== "user" && (
            <span className="shrink-0 rounded-sm border border-border px-2 py-0.5 text-xs font-medium capitalize text-text-2">
              {user.role}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div
          role="tablist"
          aria-label={t("settings.title")}
          className="relative -mx-4 flex overflow-x-auto overflow-y-hidden border-b border-border px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {indicator && (
            <span
              aria-hidden
              style={{
                width: indicator.w,
                transform: `translateX(${indicator.x}px)`,
                viewTransitionName: "settings-tab-indicator",
              }}
              className={`pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-accent ${
                indicatorReady ? "transition-[transform,width] duration-[240ms] ease-out" : ""
              }`}
            />
          )}
          {TABS.map(({ id, icon }, i) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(id, i)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-[15px] font-medium transition-colors duration-200 sm:px-4 ${
                  selected ? "text-text" : "text-text-2 hover:text-text"
                }`}
              >
                <Icon icon={icon} className="hidden text-lg sm:inline" aria-hidden />
                {t(`settings.tab_${id}`)}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          tabIndex={0}
          key={tab}
          className="flex animate-panel-in flex-col gap-8 rounded-md outline-none"
        >
          {tab === "profile" &&
            (user ? <ProfileTab /> : <GuestAccountNotice tabName={t("settings.tab_profile")} />)}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "security" &&
            (user ? (
              <SecurityTab onLogout={onLogout} />
            ) : (
              <GuestAccountNotice tabName={t("settings.tab_security")} />
            ))}
          {tab === "data" &&
            (user ? (
              <DataTab onDeleted={() => navigate("/", { replace: true })} />
            ) : (
              <GuestAccountNotice tabName={t("settings.tab_data")} />
            ))}
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- building blocks ---------- */

/** Shows a transient "Saved" for two seconds; timers are cleared on unmount. */
function useFlash() {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback(() => {
    clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => setOn(false), 2000);
  }, []);
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setOn(false);
  }, []);
  return [on, flash, clear] as const;
}

function Section({
  title,
  description,
  aside,
  tone = "default",
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2
            id={headingId}
            className={`text-lg font-semibold leading-snug ${tone === "danger" ? "text-risk-high" : "text-text"}`}
          >
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-text-2">{description}</p>}
        </div>
        {aside}
      </div>
      <div
        className={`flex flex-col rounded-lg border bg-surface ${
          tone === "danger" ? "border-risk-high/40" : "border-border"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/** One row inside a Section card. Rows are separated by a hairline. */
function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-border p-4 [&:not(:first-child)]:border-t sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

function SavedBadge({ show }: { show: boolean }) {
  const { t } = useTranslation();
  return (
    <span role="status" aria-live="polite" className="min-h-6 shrink-0">
      {show && (
        <span className="inline-flex animate-fade-up items-center gap-1.5 text-sm font-medium text-success">
          <Icon icon="ph:check-circle" className="text-base" aria-hidden />
          {t("settings.saved")}
        </span>
      )}
    </span>
  );
}

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-md border px-3.5 py-3 text-sm font-medium ${
        ok
          ? "border-success/40 bg-success-tint text-success"
          : "border-risk-high/40 bg-risk-high-tint text-risk-high"
      }`}
    >
      <Icon
        icon={ok ? "ph:check-circle" : "ph:warning-circle"}
        className="mt-0.5 shrink-0 text-base"
        aria-hidden
      />
      <span>{children}</span>
    </div>
  );
}

/**
 * Radio group drawn as a segmented control. Native radios keep keyboard support.
 * One thumb slides under the options (equal-width columns, so its offset is just
 * index x 100%). It carries a view-transition-name, so during a language or
 * theme crossfade it still visibly slides instead of fading.
 */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: string }>;
}) {
  const labelId = useId();
  const name = useId();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span id={labelId} className="text-[15px] font-medium text-text">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="relative grid auto-cols-fr grid-flow-col rounded-md border border-border bg-surface-2 p-1 sm:min-w-[280px]"
      >
        <span
          aria-hidden
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${index * 100}%)`,
            viewTransitionName: vtName("seg-thumb", name),
          }}
          className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-sm bg-surface shadow-sm ring-1 ring-border-strong transition-transform duration-[240ms] ease-out"
        />
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              style={{ viewTransitionName: vtName("seg", name, o.value) }}
              className={`relative z-[1] flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                checked ? "text-text" : "text-text-2 hover:text-text"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.icon && <Icon icon={o.icon} className="text-base" aria-hidden />}
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function GuestAccountNotice({ tabName }: { tabName: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-pine text-bone">
        <Icon icon="ph:lock-key" className="text-2xl" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-text">
          <span className="sr-only">{tabName}: </span>
          {t("settings.guest_notice_title")}
        </h2>
        <p className="mx-auto max-w-sm text-[15px] text-text-2">{t("settings.guest_notice_desc")}</p>
      </div>
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-[15px] font-semibold text-on-accent transition-colors duration-[120ms] hover:bg-accent-hover"
      >
        {t("auth.sign_in")}
      </Link>
    </div>
  );
}

/* ---------- tabs ---------- */

function ProfileTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const [name, setName] = useState(user?.display_name ?? "");
  const [saved, flashSaved, clearSaved] = useFlash();
  const [err, setErr] = useState<ParsedError | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.display_name) setName(user.display_name);
  }, [user?.display_name]);

  const dirty = name.trim() !== (user?.display_name ?? "");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    clearSaved();
    setErr(null);
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ name });
      qc.setQueryData(SESSION_KEY, updated);
      flashSaved();
    } catch (caught) {
      setErr(parseApiError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title={t("settings.profile_title")}
      description={t("settings.profile_desc")}
      aside={<SavedBadge show={saved} />}
    >
      <form onSubmit={save} noValidate>
        <Row className="flex flex-col gap-5">
          <TextField
            label={t("auth.name")}
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearSaved();
            }}
            errorKey={err?.fields.name}
            minLength={2}
            maxLength={80}
          />
          <TextField
            label={t("auth.email")}
            value={user?.email ?? ""}
            readOnly
            disabled
            hint={t("settings.email_hint")}
            className="cursor-not-allowed bg-surface-2 text-text-2"
          />
          {err && !err.fields.name && <Status ok={false}>{t(err.messageKey)}</Status>}
        </Row>
        <Row className="flex justify-end bg-surface-2/40">
          <Button type="submit" loading={saving} disabled={!dirty && !saving}>
            {t("settings.save")}
          </Button>
        </Row>
      </form>
    </Section>
  );
}

function PreferencesTab() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const [theme, setTheme] = useState<string>(user?.theme ?? "system");
  const [textSize, setTextSizeState] = useState<TextSize>(getTextSize());
  const [readAloud, setReadAloud] = useState(getReadAloudDefault());
  const [error, setError] = useState<string | null>(null);
  const [displaySaved, flashDisplay] = useFlash();
  const [deviceSaved, flashDevice] = useFlash();
  const readAloudId = useId();

  const language = user?.language ?? (i18n.language.startsWith("bn") ? "bn" : "en");

  const update = async (data: { language?: "bn" | "en"; theme?: string }) => {
    setError(null);
    // Apply locally first (crossfading the page), then save to the account.
    withViewTransition(() => {
      if (data.language) void i18n.changeLanguage(data.language);
      if (data.theme) {
        setTheme(data.theme);
        applyTheme(data.theme);
      }
    });
    if (!user) {
      flashDisplay();
      return;
    }
    try {
      const updated = await authApi.updateMe(data);
      qc.setQueryData(SESSION_KEY, updated);
      flashDisplay();
    } catch (caught) {
      setError(t(parseApiError(caught).messageKey));
    }
  };

  return (
    <>
      <Section
        title={t("settings.display_title")}
        description={user ? t("settings.display_desc") : t("settings.display_desc_guest")}
        aside={<SavedBadge show={displaySaved} />}
      >
        <Row>
          <Segmented
            label={t("settings.language")}
            value={language}
            onChange={(v) => void update({ language: v })}
            options={[
              { value: "bn", label: "বাংলা" },
              { value: "en", label: "English" },
            ]}
          />
        </Row>
        <Row>
          <Segmented
            label={t("settings.theme")}
            value={theme}
            onChange={(v) => void update({ theme: v })}
            options={[
              { value: "system", label: t("settings.theme_system"), icon: "ph:desktop" },
              { value: "dark", label: t("settings.theme_dark"), icon: "ph:moon" },
              { value: "light", label: t("settings.theme_light"), icon: "ph:sun" },
            ]}
          />
        </Row>
        {error && (
          <Row>
            <Status ok={false}>{error}</Status>
          </Row>
        )}
      </Section>

      <Section
        title={t("settings.device_title")}
        description={t("settings.device_prefs_note")}
        aside={<SavedBadge show={deviceSaved} />}
      >
        <Row>
          <Segmented
            label={t("settings.text_size")}
            value={textSize}
            onChange={(v) => {
              setTextSize(v);
              setTextSizeState(v);
              flashDevice();
            }}
            options={[
              { value: "normal", label: t("settings.text_normal") },
              { value: "large", label: t("settings.text_large") },
            ]}
          />
        </Row>
        <Row className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor={readAloudId} className="cursor-pointer text-[15px] font-medium text-text">
              {t("settings.read_aloud_default")}
            </label>
            <p id={`${readAloudId}-desc`} className="mt-0.5 text-sm text-text-2">
              {t("settings.read_aloud_desc")}
            </p>
          </div>
          <input
            id={readAloudId}
            type="checkbox"
            role="switch"
            aria-describedby={`${readAloudId}-desc`}
            checked={readAloud}
            onChange={(e) => {
              setReadAloudDefault(e.target.checked);
              setReadAloud(e.target.checked);
              flashDevice();
            }}
            className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-3 transition-colors duration-200 before:absolute before:left-0.5 before:top-0.5 before:h-[22px] before:w-[22px] before:rounded-full before:bg-text-2 before:transition-transform before:duration-200 before:ease-out checked:border-pine-hover checked:bg-pine checked:before:translate-x-5 checked:before:bg-bone"
          />
        </Row>
      </Section>
    </>
  );
}

function SecurityTab({ onLogout }: { onLogout: () => void }) {
  const { t, i18n } = useTranslation();
  const sessions = useQuery({
    queryKey: ["me", "sessions"],
    queryFn: () => authApi.listSessions(),
  });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState<ParsedError | null>(null);
  const [changed, setChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setChanged(false);
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      setChanged(true);
      setCurrent("");
      setNext("");
    } catch (caught) {
      // Server fields are `current` and `new`; the form calls them current/next.
      setErr(parseApiError(caught, { new: "next" }));
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id?: string) => {
    setRevokeError(null);
    if (id) setRevokingId(id);
    try {
      await authApi.revokeSession(id);
      await sessions.refetch();
    } catch (caught) {
      setRevokeError(t(parseApiError(caught).messageKey));
    } finally {
      if (id) setRevokingId(null);
    }
  };

  const signOutEverywhere = async () => {
    setSigningOutAll(true);
    try {
      await revoke();
      onLogout();
    } finally {
      setSigningOutAll(false);
    }
  };

  const hasFieldErrors = err ? Object.keys(err.fields).length > 0 : false;
  const otherSessions = sessions.data?.filter((s) => !s.current).length ?? 0;

  return (
    <>
      <Section title={t("settings.change_password")} description={t("settings.password_desc")}>
        <form onSubmit={changePw} noValidate>
          <Row className="flex flex-col gap-5">
            <TextField
              label={t("settings.current_password")}
              type="password"
              autoComplete="current-password"
              showPasswordToggle
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              errorKey={err?.fields.current}
              required
            />
            <TextField
              label={t("auth.new_password")}
              type="password"
              autoComplete="new-password"
              showPasswordToggle
              value={next}
              onChange={(e) => setNext(e.target.value)}
              errorKey={err?.fields.next}
              required
            />
            {changed && <Status ok>{t("settings.password_changed")}</Status>}
            {err && !hasFieldErrors && <Status ok={false}>{t(err.messageKey)}</Status>}
          </Row>
          <Row className="flex justify-end bg-surface-2/40">
            <Button type="submit" loading={saving} disabled={!current || !next}>
              {t("settings.update_password")}
            </Button>
          </Row>
        </form>
      </Section>

      <Section title={t("settings.active_sessions")} description={t("settings.sessions_desc")}>
        {sessions.isLoading && (
          <Row className="flex items-center gap-2 text-sm text-text-2">
            <Icon icon="ph:spinner" className="animate-spin text-base" aria-hidden />
            <span>{t("settings.loading_sessions")}</span>
          </Row>
        )}
        {sessions.isError && (
          <Row>
            <Status ok={false}>{t("errors.unknown")}</Status>
          </Row>
        )}
        {sessions.data && sessions.data.length === 0 && (
          <Row className="text-sm text-text-2">{t("settings.no_active_sessions")}</Row>
        )}
        {sessions.data && sessions.data.length > 0 && (
          <ul>
            {sessions.data.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 border-border p-4 [&:not(:first-child)]:border-t sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                    <Icon
                      icon={
                        s.user_agent?.toLowerCase().includes("mobile")
                          ? "ph:device-mobile"
                          : "ph:laptop"
                      }
                      className="text-xl"
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-text">
                      {s.user_agent ?? t("settings.unknown_device")}
                    </p>
                    <p className="text-sm text-text-2">
                      {s.current
                        ? t("settings.this_device")
                        : t("settings.last_seen", {
                            date: formatDate(s.last_seen_at, i18n.language),
                          })}
                    </p>
                  </div>
                </div>
                {s.current ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-success/40 bg-success-tint px-2 py-0.5 text-xs font-semibold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                    {t("settings.current_session")}
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={revokingId === s.id}
                    onClick={() => void revoke(s.id)}
                    className="shrink-0 text-risk-high hover:bg-risk-high-tint hover:text-risk-high"
                  >
                    {t("settings.revoke")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {revokeError && (
          <Row>
            <Status ok={false}>{revokeError}</Status>
          </Row>
        )}
        {otherSessions > 0 && (
          <Row className="flex justify-end bg-surface-2/40">
            <Button variant="secondary" loading={signingOutAll} onClick={signOutEverywhere}>
              <Icon icon="ph:sign-out" className="text-lg" aria-hidden />
              {t("settings.sign_out_everywhere")}
            </Button>
          </Row>
        )}
      </Section>

      <Section title={t("settings.sign_out_title")}>
        <Row className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-text-2">{t("settings.sign_out_desc")}</p>
          <Button variant="secondary" onClick={onLogout} className="shrink-0">
            <Icon icon="ph:sign-out" className="text-lg" aria-hidden />
            {t("settings.logout")}
          </Button>
        </Row>
      </Section>
    </>
  );
}

function DataTab({ onDeleted }: { onDeleted: () => void }) {
  const { t, i18n } = useTranslation();
  const { data: user } = useSession();
  const signedOut = useSignedOut();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<ParsedError | null>(null);
  const [exportError, setExportError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExportError(false);
    setExporting(true);
    try {
      const res = await fetch("/api/v1/me/export", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "prohori" },
      });
      if (!res.ok) throw new ApiError(res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prohori-my-data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setError(null);
    setDeleting(true);
    try {
      await authApi.deleteAccount(confirm);
      signedOut();
      onDeleted();
    } catch (caught) {
      setError(parseApiError(caught));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Section title={t("settings.export_title")} description={t("settings.export_desc")}>
        <Row className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
              <Icon icon="ph:file-arrow-down" className="text-xl" aria-hidden />
            </span>
            <p className="truncate font-mono text-sm text-text-2">prohori-my-data.json</p>
          </div>
          <Button variant="secondary" loading={exporting} onClick={exportData} className="shrink-0">
            <Icon icon="ph:download-simple" className="text-lg" aria-hidden />
            {t("settings.export_button")}
          </Button>
        </Row>
        {exportError && (
          <Row>
            <Status ok={false}>{t("errors.unknown")}</Status>
          </Row>
        )}
        <Row className="flex items-start gap-3 text-sm">
          <Icon icon="ph:seal-check" className="mt-0.5 shrink-0 text-lg text-text-2" aria-hidden />
          <p className="text-text-2">
            <span className="font-semibold text-text">{t("settings.consent_title")}. </span>
            {user?.consent_at
              ? t("settings.consent_recorded", { date: formatDate(user.consent_at, i18n.language) })
              : t("settings.consent_none")}
          </p>
        </Row>
      </Section>

      <Section title={t("settings.delete_title")} description={t("settings.delete_desc")} tone="danger">
        <Row className="flex flex-col gap-4">
          <TextField
            label={t("settings.delete_confirm_label")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            spellCheck={false}
            errorKey={error?.fields.confirm}
            className="font-mono"
          />
          {error && !error.fields.confirm && <Status ok={false}>{t(error.messageKey)}</Status>}
          <div className="flex justify-end">
            <Button
              variant="danger"
              disabled={confirm !== "DELETE"}
              loading={deleting}
              onClick={deleteAccount}
            >
              <Icon icon="ph:trash" className="text-lg" aria-hidden />
              {t("settings.delete_button")}
            </Button>
          </div>
        </Row>
      </Section>
    </>
  );
}
