// Session state for the SPA. The `session` query is the single source of truth
// for "who is signed in"; login/logout mutations update it.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { authApi, type User } from "./api";
import {
  applyTextSize,
  applyTheme,
  clearPendingOnboarding,
  takePendingOnboarding,
} from "./preferences";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  return useQuery<User | null>({
    queryKey: SESSION_KEY,
    queryFn: () => authApi.getSession(),
    staleTime: 60_000,
  });
}

/** Where a signed-in user lands (Doc 01 S03): staff → S24, others → S09/S08. */
export function homeFor(user: User): string {
  if (user.role === "reviewer" || user.role === "admin") return "/review";
  return user.onboarding_completed ? "/check" : "/onboarding";
}

/**
 * Applies the signed-in user's language and theme (and this device's text
 * size), and replays an onboarding save that failed last time (Doc 01 S08).
 */
export function useSyncLanguage(user: User | null | undefined) {
  const { i18n } = useTranslation();
  const qc = useQueryClient();

  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      void i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  useEffect(() => {
    applyTheme(user?.theme);
    applyTextSize();
  }, [user?.theme]);

  useEffect(() => {
    if (!user) return;
    const pending = takePendingOnboarding();
    if (!pending) return;
    if (user.onboarding_completed) {
      clearPendingOnboarding();
      return;
    }
    authApi
      .updateMe({ language: pending.language, onboarding_completed: true })
      .then((updated) => {
        clearPendingOnboarding();
        qc.setQueryData(SESSION_KEY, updated);
      })
      .catch(() => {
        // Still offline or failing: keep it queued for the next load.
      });
  }, [user, qc]);
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (user) => {
      qc.setQueryData(SESSION_KEY, user);
    },
  });
}

/** Clears every cached query and marks the visitor signed out. */
export function useSignedOut() {
  const qc = useQueryClient();
  return () => {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
    qc.setQueryData(SESSION_KEY, null);
  };
}

export function useLogout() {
  const signedOut = useSignedOut();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: signedOut,
  });
}
