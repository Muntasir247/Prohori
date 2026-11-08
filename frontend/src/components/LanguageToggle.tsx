import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

// Two-option segmented control. 44 px hit area; active option uses the
// Pine fill (Doc 01 §3: secondary 30%).
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isBn = i18n.language === "bn";

  const toggle = () => {
    void i18n.changeLanguage(isBn ? "en" : "bn");
  };

  const seg = (active: boolean) =>
    `rounded-[6px] px-2.5 py-1 text-[13px] font-medium leading-5 transition-colors duration-[120ms] ${
      active ? "bg-pine text-bone" : "text-text-2 group-hover:text-text"
    }`;

  return (
    <button
      type="button"
      data-testid="language-toggle"
      onClick={toggle}
      aria-label="Toggle language"
      className="group inline-flex min-h-11 items-center gap-1 rounded-md px-1"
    >
      <Icon icon="ph:translate" className="hidden text-lg text-text-2 sm:block" aria-hidden />
      <span className="inline-flex items-center rounded-md border border-border bg-surface p-0.5">
        <span lang="bn" className={seg(isBn)}>
          বাংলা
        </span>
        <span lang="en" className={seg(!isBn)}>
          EN
        </span>
      </span>
    </button>
  );
}
