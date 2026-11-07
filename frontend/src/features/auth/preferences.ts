// Display preferences and the S08 "save locally, retry next load" queue.
//
// Language and theme live on the account (PATCH /me). Text size and the
// read-aloud default have no column in the Section 8 `users` table, so they are
// per-device conveniences kept in localStorage. Every storage access is guarded:
// private windows and blocked storage must never break a page.
import type { User } from "./api";

export type TextSize = "normal" | "large";
export type Theme = "system" | "light" | "dark";

const TEXT_SIZE_KEY = "prohori.textSize";
const READ_ALOUD_KEY = "prohori.readAloudDefault";
const PENDING_ONBOARDING_KEY = "prohori.pendingOnboarding";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the preference simply does not persist.
  }
}

export function getTextSize(): TextSize {
  return read(TEXT_SIZE_KEY) === "large" ? "large" : "normal";
}

export function setTextSize(size: TextSize): void {
  write(TEXT_SIZE_KEY, size);
  applyTextSize(size);
}

export function applyTextSize(size: TextSize = getTextSize()): void {
  if (size === "large") document.documentElement.dataset.textSize = "large";
  else delete document.documentElement.dataset.textSize;
}

export function getReadAloudDefault(): boolean {
  return read(READ_ALOUD_KEY) === "on";
}

export function setReadAloudDefault(on: boolean): void {
  write(READ_ALOUD_KEY, on ? "on" : "off");
}

export function applyTheme(theme: string | undefined): void {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

// --- S08: onboarding saves that failed are retried on the next load --------
export interface PendingOnboarding {
  language: User["language"];
}

export function queueOnboarding(pending: PendingOnboarding): void {
  write(PENDING_ONBOARDING_KEY, JSON.stringify(pending));
}

export function takePendingOnboarding(): PendingOnboarding | null {
  const raw = read(PENDING_ONBOARDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingOnboarding;
    return parsed.language === "bn" || parsed.language === "en" ? parsed : null;
  } catch {
    write(PENDING_ONBOARDING_KEY, null);
    return null;
  }
}

export function clearPendingOnboarding(): void {
  write(PENDING_ONBOARDING_KEY, null);
}
