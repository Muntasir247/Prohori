import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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

type Tab = "profile" | "preferences" | "security" | "data";
const TABS: Tab[] = ["profile", "preferences", "security", "data"];

// S22 Settings (Doc 01): Profile, Preferences, Security, Your data.
export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useSession();
  const logout = useLogout();
  const [tab, setTab] = useState<Tab>("profile");

  if (!user) return null;

  const onLogout = async () => {
    await logout.mutateAsync().catch(() => undefined);
    navigate("/", { replace: true });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`min-h-11 whitespace-nowrap px-3 py-2 text-sm font-medium ${
              tab === id ? "border-b-2 border-brand text-brand" : "text-muted"
            }`}
          >
            {t(`settings.tab_${id}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "profile" && <ProfileTab />}
        {tab === "preferences" && <PreferencesTab />}
        {tab === "security" && <SecurityTab onLogout={onLogout} />}
        {tab === "data" && <DataTab onDeleted={() => navigate("/", { replace: true })} />}
      </div>
    </AppShell>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      {children}
    </div>
  );
}

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role={ok ? "status" : "alert"} className={`text-sm ${ok ? "text-brand" : "text-red-600"}`}>
      {children}
    </p>
  );
}

function ProfileTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const [name, setName] = useState(user?.display_name ?? "");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<ParsedError | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setErr(null);
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ name });
      qc.setQueryData(SESSION_KEY, updated);
      setSaved(true);
    } catch (caught) {
      setErr(parseApiError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <TextField
          label={t("auth.name")}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          errorKey={err?.fields.name}
          minLength={2}
          maxLength={80}
        />
        <TextField label={t("auth.email")} value={user?.email ?? ""} readOnly disabled />
        <Button type="submit" className="sm:w-auto" loading={saving}>
          {t("settings.save")}
        </Button>
        {saved && <Status ok>{t("settings.saved")}</Status>}
        {err && !err.fields.name && <Status ok={false}>{t(err.messageKey)}</Status>}
      </form>
    </Panel>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-lg border border-border bg-surface px-3"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreferencesTab() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const [textSize, setTextSizeState] = useState<TextSize>(getTextSize());
  const [readAloud, setReadAloud] = useState(getReadAloudDefault());
  const [error, setError] = useState<string | null>(null);

  const update = async (data: { language?: "bn" | "en"; theme?: string }) => {
    setError(null);
    try {
      const updated = await authApi.updateMe(data);
      qc.setQueryData(SESSION_KEY, updated);
      if (data.language) void i18n.changeLanguage(data.language);
      if (data.theme) applyTheme(data.theme);
    } catch (caught) {
      setError(t(parseApiError(caught).messageKey));
    }
  };

  return (
    <Panel>
      <Select
        label={t("settings.language")}
        value={user?.language ?? "bn"}
        onChange={(v) => update({ language: v as "bn" | "en" })}
        options={[
          { value: "bn", label: "বাংলা" },
          { value: "en", label: "English" },
        ]}
      />
      <Select
        label={t("settings.theme")}
        value={user?.theme ?? "system"}
        onChange={(v) => update({ theme: v })}
        options={[
          { value: "system", label: t("settings.theme_system") },
          { value: "dark", label: t("settings.theme_dark") },
          { value: "light", label: t("settings.theme_light") },
        ]}
      />
      <Select
        label={t("settings.text_size")}
        value={textSize}
        onChange={(v) => {
          const size = v === "large" ? "large" : "normal";
          setTextSize(size);
          setTextSizeState(size);
        }}
        options={[
          { value: "normal", label: t("settings.text_normal") },
          { value: "large", label: t("settings.text_large") },
        ]}
      />
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={readAloud}
          onChange={(e) => {
            setReadAloudDefault(e.target.checked);
            setReadAloud(e.target.checked);
          }}
          className="h-5 w-5 accent-[var(--color-brand)]"
        />
        {t("settings.read_aloud_default")}
      </label>
      <p className="text-xs text-muted">{t("settings.device_prefs_note")}</p>
      {error && <Status ok={false}>{error}</Status>}
    </Panel>
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
    try {
      await authApi.revokeSession(id);
      await sessions.refetch();
    } catch (caught) {
      setRevokeError(t(parseApiError(caught).messageKey));
    }
  };

  const signOutEverywhere = async () => {
    await revoke();
    onLogout();
  };

  const hasFieldErrors = err ? Object.keys(err.fields).length > 0 : false;

  return (
    <Panel>
      <form onSubmit={changePw} className="flex flex-col gap-4" noValidate>
        <h2 className="text-sm font-semibold">{t("settings.change_password")}</h2>
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
        <Button type="submit" className="sm:w-auto" loading={saving}>
          {t("settings.update_password")}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <h2 className="mb-2 text-sm font-semibold">{t("settings.active_sessions")}</h2>
        {sessions.isError && <Status ok={false}>{t("errors.unknown")}</Status>}
        <ul className="flex flex-col gap-2">
          {sessions.data?.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate">
                  {s.user_agent ?? t("settings.unknown_device")}
                </span>
                <span className="text-xs text-muted">
                  {s.current
                    ? t("settings.this_device")
                    : t("settings.last_seen", {
                        date: formatDate(s.last_seen_at, i18n.language),
                      })}
                </span>
              </span>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => void revoke(s.id)}
                  className="min-h-11 shrink-0 px-2 text-xs text-red-600 hover:underline"
                >
                  {t("settings.revoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
        {revokeError && <Status ok={false}>{revokeError}</Status>}
        <Button variant="ghost" className="mt-3 sm:w-auto" onClick={signOutEverywhere}>
          {t("settings.sign_out_everywhere")}
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <Button variant="ghost" className="sm:w-auto" onClick={onLogout}>
          {t("settings.logout")}
        </Button>
      </div>
    </Panel>
  );
}

function DataTab({ onDeleted }: { onDeleted: () => void }) {
  const { t, i18n } = useTranslation();
  const { data: user } = useSession();
  const signedOut = useSignedOut();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<ParsedError | null>(null);
  const [exportError, setExportError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExportError(false);
    try {
      const res = await fetch("/api/v1/me/export", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "prohori" },
      });
      if (!res.ok) throw new ApiError(res.status);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "prohori-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(true);
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
    <Panel>
      <div>
        <h2 className="mb-1 text-sm font-semibold">{t("settings.export_title")}</h2>
        <p className="mb-3 text-sm text-muted">{t("settings.export_desc")}</p>
        <Button variant="ghost" className="sm:w-auto" onClick={exportData}>
          {t("settings.export_button")}
        </Button>
        {exportError && <Status ok={false}>{t("errors.unknown")}</Status>}
      </div>
      <div className="border-t border-border pt-4">
        <h2 className="mb-1 text-sm font-semibold text-red-600">
          {t("settings.delete_title")}
        </h2>
        <p className="mb-3 text-sm text-muted">{t("settings.delete_desc")}</p>
        <TextField
          label={t("settings.delete_confirm_label")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
          errorKey={error?.fields.confirm}
        />
        {error && !error.fields.confirm && <Status ok={false}>{t(error.messageKey)}</Status>}
        <Button
          variant="danger"
          className="mt-3 sm:w-auto"
          disabled={confirm !== "DELETE"}
          loading={deleting}
          onClick={deleteAccount}
        >
          {t("settings.delete_button")}
        </Button>
      </div>
      <div className="border-t border-border pt-4 text-xs text-muted">
        <h2 className="mb-1 text-sm font-semibold text-text">{t("settings.consent_title")}</h2>
        {user?.consent_at
          ? t("settings.consent_recorded", { date: formatDate(user.consent_at, i18n.language) })
          : t("settings.consent_none")}
      </div>
    </Panel>
  );
}
