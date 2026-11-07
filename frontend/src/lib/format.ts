// Locale-aware formatting helpers. Bangla-first: digits and amounts render in
// Bengali numerals when the active language is bn.

export type Lang = "bn" | "en";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert ASCII digits in a string to Bengali digits (bn) or leave as-is (en). */
export function toLocaleDigits(value: string | number, lang: Lang): string {
  const s = String(value);
  if (lang !== "bn") return s;
  return s.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/** Format a BDT amount with lakh grouping and locale digits. */
export function formatAmount(amount: number, lang: Lang): string {
  const locale = lang === "bn" ? "bn-BD" : "en-IN";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(amount);
}
