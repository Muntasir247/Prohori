// Auth API calls, thin wrappers over apiFetch. Mirrors Doc 02 Section 9.
import { apiFetch } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "reviewer" | "admin";
  language: "bn" | "en";
  theme: string;
  email_verified: boolean;
  onboarding_completed: boolean;
  consent_at: string | null;
  created_at: string;
}

export interface SessionInfo {
  id: string;
  user_agent: string | null;
  last_seen_at: string;
  created_at: string;
  current: boolean;
}

const post = (path: string, body?: unknown) =>
  apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const authApi = {
  getSession: () => apiFetch<User | null>("/auth/session"),

  register: (data: {
    name: string;
    email: string;
    password: string;
    language: "bn" | "en";
    consent: boolean;
  }) => post("/auth/register", data),

  verifyEmail: (token: string) => post("/auth/verify-email", { token }),

  resendVerification: (email: string) =>
    post("/auth/resend-verification", { email }),

  login: (email: string, password: string) =>
    apiFetch<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => post("/auth/logout"),

  forgotPassword: (email: string) => post("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    post("/auth/reset-password", { token, password }),

  acceptInvite: (token: string, name: string, password: string) =>
    post("/auth/accept-invite", { token, name, password }),

  me: () => apiFetch<User>("/me"),

  updateMe: (data: Partial<{
    name: string;
    language: "bn" | "en";
    theme: string;
    onboarding_completed: boolean;
  }>) => apiFetch<User>("/me", { method: "PATCH", body: JSON.stringify(data) }),

  changePassword: (current: string, next: string) =>
    post("/me/password", { current, new: next }),

  listSessions: () => apiFetch<SessionInfo[]>("/me/sessions"),

  revokeSession: (id?: string) =>
    apiFetch(`/me/sessions${id ? `?id=${encodeURIComponent(id)}` : ""}`, {
      method: "DELETE",
    }),

  deleteAccount: (confirm: string) =>
    apiFetch("/me", { method: "DELETE", body: JSON.stringify({ confirm }) }),
};
