import { useTranslation } from "react-i18next";

// Minimal bn/en switch. Signed-in users' choice is persisted via PATCH /me by
// the screens that own it; this toggle changes the live UI language.
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === "bn" ? "en" : "bn";
  return (
    <button
      type="button"
      data-testid="language-toggle"
      onClick={() => void i18n.changeLanguage(next)}
      className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text"
      aria-label="Toggle language"
    >
      {i18n.language === "bn" ? "English" : "বাংলা"}
    </button>
  );
}
