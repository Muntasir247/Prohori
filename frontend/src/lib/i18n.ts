// i18next setup. Bangla is the default and fallback language; English is opt-in.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import bnCommon from "@/i18n/bn/common.json";
import enCommon from "@/i18n/en/common.json";

export const DEFAULT_LANG = "bn" as const;

void i18n.use(initReactI18next).init({
  resources: {
    bn: { common: bnCommon },
    en: { common: enCommon },
  },
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
