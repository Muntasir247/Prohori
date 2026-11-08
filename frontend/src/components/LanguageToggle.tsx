import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

import { withViewTransition } from "@/lib/viewTransition";

// Two-option segmented control. 44 px hit area; the active option sits on a
// Pine pill (Doc 01 §3: secondary 30%). Switching crossfades the page while the
// pill slides across: it carries a view-transition-name, and a plain transform
// transition covers browsers without View Transitions.
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isBn = i18n.language === "bn";

  const toggle = () => {
    withViewTransition(() => {
      void i18n.changeLanguage(isBn ? "en" : "bn");
    });
  };

  const label = (active: boolean) =>
    `relative z-[1] flex h-7 w-12 items-center justify-center text-[13px] font-medium leading-5 transition-colors duration-200 ${
      active ? "text-bone" : "text-text-2 group-hover:text-text"
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
      <span className="relative inline-flex items-center rounded-md border border-border bg-surface p-0.5">
        <span
          aria-hidden
          style={{ viewTransitionName: "lang-toggle-pill" }}
          className={`absolute left-0.5 top-0.5 h-7 w-12 rounded-[6px] bg-pine transition-transform duration-[240ms] ease-out ${
            isBn ? "translate-x-0" : "translate-x-full"
          }`}
        />
        <span lang="bn" className={label(isBn)} style={{ viewTransitionName: "lang-toggle-bn" }}>
          বাংলা
        </span>
        <span lang="en" className={label(!isBn)} style={{ viewTransitionName: "lang-toggle-en" }}>
          EN
        </span>
      </span>
    </button>
  );
}
