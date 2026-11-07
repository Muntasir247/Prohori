import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RequireRole } from "@/components/RequireRole";
import { ApiError } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import i18n from "@/lib/i18n";
import Login from "@/routes/public/Login";
import Onboarding from "@/routes/user/Onboarding";
import Settings from "@/routes/user/Settings";

import type { User } from "./api";
import { takePendingOnboarding } from "./preferences";

// --- helpers ---------------------------------------------------------------
type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function envelope(code: string, messageKey: string, extra: object = {}) {
  return {
    error: { code, message_key: messageKey, fields: {}, request_id: "r1", ...extra },
  };
}

function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const handler = routes[`${method} ${url}`];
    if (!handler) return json(404, envelope("not_found", "errors.not_found"));
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const baseUser: User = {
  id: "u1",
  email: "user@example.com",
  display_name: "Rahim",
  role: "user",
  language: "bn",
  theme: "system",
  email_verified: true,
  onboarding_completed: true,
  consent_at: "2026-11-01T10:00:00Z",
  created_at: "2026-11-01T10:00:00Z",
};

function renderAt(path: string, routes: Array<{ path: string; element: ReactNode }>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(async () => {
  await i18n.changeLanguage("bn");
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// --- parseApiError ---------------------------------------------------------
describe("parseApiError", () => {
  it("keeps the server's specific lock message rather than a generic 429", () => {
    const err = new ApiError(429, envelope("rate_limited", "errors.login_locked", { retry_after: 900 }));
    const parsed = parseApiError(err);
    expect(parsed.messageKey).toBe("errors.login_locked");
    expect(parsed.retryAfter).toBe(900);
  });

  it("maps pydantic field codes to readable field messages", () => {
    const err = new ApiError(422, {
      error: {
        code: "validation_error",
        message_key: "errors.validation_error",
        fields: { name: "string_too_short", email: "value_error", x: "weird_code" },
        request_id: "r",
      },
    });
    const { fields } = parseApiError(err);
    expect(fields).toEqual({
      name: "errors.field.too_short",
      email: "errors.field.invalid_email",
      x: "errors.field.invalid",
    });
  });

  it("renames server fields to form fields", () => {
    const err = new ApiError(422, {
      error: { code: "weak_password", message_key: "errors.password_too_short", fields: { new: "too_short" }, request_id: "r" },
    });
    expect(parseApiError(err, { new: "next" }).fields).toEqual({ next: "errors.field.too_short" });
  });
});

// --- S03 Login -------------------------------------------------------------
async function submitLogin(email = "user@example.com", password = "whatever-pass") {
  fireEvent.change(await screen.findByLabelText(i18n.t("auth.email")), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(i18n.t("auth.password")), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: i18n.t("auth.sign_in") }));
}

describe("Login (S03)", () => {
  const routes = [
    { path: "/login", element: <Login /> },
    { path: "/check", element: <p>check-home</p> },
    { path: "/onboarding", element: <p>onboarding</p> },
    { path: "/review", element: <p>review-home</p> },
  ];

  it.each(["bn", "en"])("shows the 15-minute lock message in %s", async (lang) => {
    await i18n.changeLanguage(lang);
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, null),
      "POST /api/v1/auth/login": () =>
        json(429, envelope("rate_limited", "errors.login_locked", { retry_after: 900 })),
    });
    renderAt("/login", routes);
    await submitLogin();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      lang === "bn" ? "অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট অপেক্ষা করুন।" : "Too many tries. Wait 15 minutes.",
    );
  });

  it("gives one message for any bad credential, never which part was wrong", async () => {
    await i18n.changeLanguage("en");
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, null),
      "POST /api/v1/auth/login": () =>
        json(401, envelope("invalid_credentials", "errors.invalid_credentials")),
    });
    renderAt("/login", routes);
    await submitLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is wrong");
  });

  it("maps server field errors inline", async () => {
    await i18n.changeLanguage("en");
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, null),
      "POST /api/v1/auth/login": () =>
        json(422, {
          error: { code: "validation_error", message_key: "errors.validation_error", fields: { email: "value_error" }, request_id: "r" },
        }),
    });
    renderAt("/login", routes);
    await submitLogin("not-an-email");
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    ["reviewer", "review-home"],
    ["admin", "review-home"],
    ["user", "check-home"],
  ] as const)("sends a %s to the right home", async (role, landing) => {
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, null),
      "POST /api/v1/auth/login": () => json(200, { ...baseUser, role }),
    });
    renderAt("/login", routes);
    await submitLogin();
    expect(await screen.findByText(landing)).toBeInTheDocument();
  });

  it("sends a new user to onboarding first", async () => {
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, null),
      "POST /api/v1/auth/login": () => json(200, { ...baseUser, onboarding_completed: false }),
    });
    renderAt("/login", routes);
    await submitLogin();
    expect(await screen.findByText("onboarding")).toBeInTheDocument();
  });

  it("shows the post-reset notice", async () => {
    await i18n.changeLanguage("en");
    mockFetch({ "GET /api/v1/auth/session": () => json(200, null) });
    renderAt("/login?reset=1", routes);
    expect(await screen.findByRole("status")).toHaveTextContent("signed out everywhere");
  });
});

// --- RequireRole -----------------------------------------------------------
describe("RequireRole", () => {
  const routes = [
    {
      path: "/review",
      element: (
        <RequireRole roles={["reviewer", "admin"]}>
          <p>reviewer-only</p>
        </RequireRole>
      ),
    },
    { path: "/check", element: <p>check-home</p> },
    { path: "/login", element: <p>login-page</p> },
  ];

  it("keeps a normal user out of reviewer routes", async () => {
    mockFetch({ "GET /api/v1/auth/session": () => json(200, baseUser) });
    renderAt("/review", routes);
    expect(await screen.findByText("check-home")).toBeInTheDocument();
    expect(screen.queryByText("reviewer-only")).not.toBeInTheDocument();
  });

  it("sends a guest to sign in", async () => {
    mockFetch({ "GET /api/v1/auth/session": () => json(200, null) });
    renderAt("/review", routes);
    expect(await screen.findByText("login-page")).toBeInTheDocument();
  });

  it("lets a reviewer through", async () => {
    mockFetch({ "GET /api/v1/auth/session": () => json(200, { ...baseUser, role: "reviewer" }) });
    renderAt("/review", routes);
    expect(await screen.findByText("reviewer-only")).toBeInTheDocument();
  });
});

// --- S08 Onboarding --------------------------------------------------------
describe("Onboarding (S08)", () => {
  it("saves locally when the server call fails, then continues", async () => {
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, { ...baseUser, onboarding_completed: false }),
      "PATCH /api/v1/me": () => {
        throw new TypeError("network down");
      },
    });
    renderAt("/onboarding", [
      { path: "/onboarding", element: <Onboarding /> },
      { path: "/check", element: <p>check-home</p> },
    ]);
    fireEvent.click(await screen.findByRole("button", { name: "English" }));
    fireEvent.click(screen.getByRole("button", { name: i18n.t("onboarding.skip") }));
    expect(await screen.findByText("check-home")).toBeInTheDocument();
    expect(takePendingOnboarding()).toEqual({ language: "en" });
  });
});

// --- S22 Settings ----------------------------------------------------------
describe("Settings (S22)", () => {
  it("puts change-password errors on the right fields", async () => {
    await i18n.changeLanguage("en");
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, { ...baseUser, language: "en" }),
      "GET /api/v1/me/sessions": () => json(200, []),
      "POST /api/v1/me/password": () =>
        json(422, {
          error: { code: "weak_password", message_key: "errors.password_too_short", fields: { new: "too_short" }, request_id: "r" },
        }),
    });
    renderAt("/settings", [{ path: "/settings", element: <Settings /> }]);
    fireEvent.click(await screen.findByRole("tab", { name: "Security" }));
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password-1" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toHaveAttribute("aria-invalid", "true"),
    );
    expect(screen.getByLabelText("Current password")).not.toHaveAttribute("aria-invalid");
  });

  it("shows all four tabs and the S22 preference controls in Bangla", async () => {
    mockFetch({ "GET /api/v1/auth/session": () => json(200, baseUser) });
    renderAt("/settings", [{ path: "/settings", element: <Settings /> }]);
    for (const name of ["প্রোফাইল", "পছন্দ", "নিরাপত্তা", "আপনার তথ্য"]) {
      expect(await screen.findByRole("tab", { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("tab", { name: "পছন্দ" }));
    expect(screen.getByLabelText("লেখার আকার")).toBeInTheDocument();
    expect(screen.getByLabelText("ফলাফল সবসময় পড়ে শোনান")).toBeInTheDocument();
  });
});
