// Session state for the SPA. The `session` query is the single source of truth
// for "who is signed in"; login/logout mutations invalidate it.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { authApi, type User } from "./api";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  return useQuery<User | null>({
    queryKey: SESSION_KEY,
    queryFn: () => authApi.getSession(),
    staleTime: 60_000,
  });
}

/** Keeps the active i18n language in sync with the signed-in user's choice. */
export function useSyncLanguage(user: User | null | undefined) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      void i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);
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

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(SESSION_KEY, null);
      void qc.invalidateQueries();
    },
  });
}
