import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authApi } from "@/features/auth/api";
import { SESSION_KEY, useLogout, useSession } from "@/features/auth/useSession";
import { parseApiError } from "@/lib/apiError";

type Tab = "profile" | "preferences" | "security" | "data";

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useSession();
  const logout = useLogout();
  const [tab, setTab] = useState<Tab>("profile");

  if (!user) return null;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "profile", label: t("settings.tab_profile") },
    { id: "preferences", label: t("settings.tab_preferences") },
    { id: "security", label: t("settings.tab_security") },
    { id: "data", label: t("settings.tab_data") },
  ];

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate("/", { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <LanguageToggle />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            role="tab"
            aria-selected={tab === tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${
              tab === tabItem.id
                ? "border-b-2 border-brand text-brand"
                : "text-muted"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </nav>

      {tab === "profile" && <ProfileTab />}
      {tab === "preferences" && <PreferencesTab />}
      {tab === "security" && <SecurityTab onLogout={onLogout} />}
      {tab === "data" && <DataTab onDeleted={() => navigate("/", { replace: true })} />}

      <p className="text-xs text-muted">
        {t("settings.consent_recorded", {
          date: user.created_at.slice(0, 10),
        })}
      </p>

      <button
        type="button"
        onClick={onLogout}
        className="self-start text-sm text-muted hover:text-text"
      >
        {t("settings.logout")}
      </button>
    </main>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      {children}
    </div>
  );
}

function ProfileTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const [name, setName] = useState(user?.display_name ?? "");
  const [saved, setSaved] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const updated = await authApi.updateMe({ name });
    qc.setQueryData(SESSION_KEY, updated);
    setSaved(true);
  };

  return (
    <Panel>
      <form onSubmit={save} className="flex flex-col gap-4">
        <TextField
          label={t("auth.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
        />
        <TextField label={t("auth.email")} value={user?.email ?? ""} disabled />
        <Button type="submit" className="sm:w-auto">
          {t("settings.save")}
        </Button>
        {saved && <p className="text-sm text-brand">{t("settings.saved")}</p>}
      </form>
    </Panel>
  );
}

function PreferencesTab() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useSession();

  const update = async (data: { language?: "bn" | "en"; theme?: string }) => {
    const updated = await authApi.updateMe(data);
    qc.setQueryData(SESSION_KEY, updated);
    if (data.language) void i18n.changeLanguage(data.language);
    if (data.theme) {
      document.documentElement.dataset.theme =
        data.theme === "system" ? "" : data.theme;
    }
  };

  return (
    <Panel>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.language")}
        <select
          value={user?.language ?? "bn"}
          onChange={(e) => update({ language: e.target.value as "bn" | "en" })}
          className="min-h-11 rounded-lg border border-border bg-surface px-3"
        >
          <option value="bn">বাংলা</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.theme")}
        <select
          value={user?.theme ?? "system"}
          onChange={(e) => update({ theme: e.target.value })}
          className="min-h-11 rounded-lg border border-border bg-surface px-3"
        >
          <option value="system">{t("settings.theme_system")}</option>
          <option value="light">{t("settings.theme_light")}</option>
          <option value="dark">{t("settings.theme_dark")}</option>
        </select>
      </label>
    </Panel>
  );
}

function SecurityTab({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const sessions = useQuery({
    queryKey: ["me", "sessions"],
    queryFn: () => authApi.listSessions(),
  });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ key: string; ok: boolean } | null>(null);

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await authApi.changePassword(current, next);
      setMsg({ key: "settings.password_changed", ok: true });
      setCurrent("");
      setNext("");
    } catch (caught) {
      setMsg({ key: parseApiError(caught).messageKey, ok: false });
    }
  };

  const signOutEverywhere = async () => {
    await authApi.revokeSession();
    void sessions.refetch();
    onLogout();
  };

  return (
    <Panel>
      <form onSubmit={changePw} className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">{t("settings.change_password")}</h2>
        <TextField
          label={t("settings.current_password")}
          type="password"
          showPasswordToggle
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <TextField
          label={t("auth.new_password")}
          type="password"
          showPasswordToggle
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-brand" : "text-red-600"}`}>
            {t(msg.key)}
          </p>
        )}
        <Button type="submit" className="sm:w-auto">
          {t("settings.update_password")}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <h2 className="mb-2 text-sm font-semibold">{t("settings.active_sessions")}</h2>
        <ul className="flex flex-col gap-2">
          {sessions.data?.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="truncate">
                {s.user_agent ?? t("settings.unknown_device")}
                {s.current && (
                  <span className="ml-2 text-xs text-brand">
                    {t("settings.this_device")}
                  </span>
                )}
              </span>
              {!s.current && (
                <button
                  type="button"
                  onClick={async () => {
                    await authApi.revokeSession(s.id);
                    void sessions.refetch();
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  {t("settings.revoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="mt-3 sm:w-auto" onClick={signOutEverywhere}>
          {t("settings.sign_out_everywhere")}
        </Button>
      </div>
    </Panel>
  );
}

function DataTab({ onDeleted }: { onDeleted: () => void }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const exportData = async () => {
    const res = await fetch("/api/v1/me/export", {
      credentials: "same-origin",
      headers: { "X-Requested-With": "prohori" },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prohori-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    setError(null);
    try {
      await authApi.deleteAccount(confirm);
      onDeleted();
    } catch (caught) {
      setError(parseApiError(caught).messageKey);
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
          errorKey={error ? "errors.field.must_equal_DELETE" : undefined}
        />
        <Button
          variant="danger"
          className="mt-3 sm:w-auto"
          disabled={confirm !== "DELETE"}
          onClick={deleteAccount}
        >
          {t("settings.delete_button")}
        </Button>
      </div>
    </Panel>
  );
}
