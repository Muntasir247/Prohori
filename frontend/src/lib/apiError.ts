// Normalises a thrown ApiError into an i18n message key plus per-field keys the
// forms can render inline. Keeps server copy out of the client (Doc 02 §7: the
// backend emits message_key, never a sentence).
import { ApiError } from "@/lib/api";
import { toLocaleDigits } from "@/lib/format";
import i18n from "@/lib/i18n";

export interface ParsedError {
  status?: number;
  code?: string;
  messageKey: string;
  fields: Record<string, string>;
  retryAfter?: number;
}

// Pydantic validation codes (from the 422 envelope) → our field copy.
const FIELD_ALIASES: Record<string, string> = {
  missing: "required",
  string_too_short: "too_short",
  string_too_long: "too_long",
  value_error: "invalid_email",
  literal_error: "invalid",
  bool_parsing: "invalid",
};

function fieldKey(code: string): string {
  const key = `errors.field.${FIELD_ALIASES[code] ?? code}`;
  return i18n.exists(key) ? key : "errors.field.invalid";
}

/**
 * @param fieldMap optional rename of server field names to form field names
 *   (e.g. the change-password form calls the server's `new` field `next`).
 */
export function parseApiError(
  err: unknown,
  fieldMap: Record<string, string> = {},
): ParsedError {
  if (err instanceof ApiError) {
    const fields: Record<string, string> = {};
    for (const [name, code] of Object.entries(err.fields)) {
      fields[fieldMap[name] ?? name] = fieldKey(code);
    }
    // Keep the server's specific key (e.g. errors.login_locked → "Wait 15
    // minutes"); fall back to the generic one only if the key is unknown.
    const messageKey = i18n.exists(err.messageKey)
      ? err.messageKey
      : err.status === 429
        ? "errors.rate_limited"
        : "errors.unknown";
    return {
      status: err.status,
      code: err.code,
      messageKey,
      fields,
      retryAfter: err.retryAfter,
    };
  }
  return { messageKey: "errors.network", fields: {} };
}

/** "15 minutes" / "45 seconds" wait text for a Retry-After value, localised
 * (Bengali digits in bn). */
export function waitText(seconds: number | undefined): string {
  const s = Math.max(1, Math.round(seconds ?? 0));
  const lang = i18n.language === "en" ? "en" : "bn";
  return s >= 60
    ? i18n.t("time.minutes", { n: toLocaleDigits(Math.ceil(s / 60), lang) })
    : i18n.t("time.seconds", { n: toLocaleDigits(s, lang) });
}
