// Normalises a thrown ApiError into an i18n message key plus per-field keys the
// forms can render inline. Keeps server copy out of the client (Doc 02 §7: the
// backend emits message_key, never a sentence).
import { ApiError } from "@/lib/api";

export interface ParsedError {
  messageKey: string;
  fields: Record<string, string>;
  retryAfter?: number;
}

export function parseApiError(err: unknown): ParsedError {
  if (err instanceof ApiError) {
    const fields: Record<string, string> = {};
    for (const [name, code] of Object.entries(err.fields)) {
      fields[name] = `errors.field.${code}`;
    }
    // A 429 gets a dedicated key so the UI can show the wait time.
    const messageKey =
      err.status === 429 && err.code === "rate_limited"
        ? "errors.rate_limited"
        : err.messageKey;
    return { messageKey, fields, retryAfter: err.retryAfter };
  }
  return { messageKey: "errors.unknown", fields: {} };
}
