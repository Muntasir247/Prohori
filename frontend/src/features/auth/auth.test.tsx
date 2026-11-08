import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RequireRole } from "@/components/RequireRole";
import { ApiError } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import i18n from "@/lib/i18n";
import AcceptInvite from "@/routes/public/AcceptInvite";
import ForgotPassword from "@/routes/public/ForgotPassword";
import Login from "@/routes/public/Login";
import Register from "@/routes/public/Register";
import ResetPassword from "@/routes/public/ResetPassword";
import VerifyEmail from "@/routes/public/VerifyEmail";
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

// --- S04 Register ----------------------------------------------------------
describe("Register (S04)", () => {
  const routes = [
    { path: "/register", element: <Register /> },
    { path: "/verify-email", element: <p>verify-email-page</p> },
    { path: "/login", element: <p>login-page</p> },
  ];

  it.each(["bn", "en"])("renders registration in %s and requires consent", async (lang) => {
    await i18n.changeLanguage(lang);
    renderAt("/register", routes);

    const submitBtn = screen.getByRole("button", { name: i18n.t("auth.create_account") });
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(i18n.t("errors.field.required"));
  });

  it("submits registration successfully and redirects to verify-email", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, null),
      "POST /api/v1/auth/register": async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return json(202, { ok: true });
      },
    });

    renderAt("/register", routes);
    fireEvent.change(await screen.findByLabelText(i18n.t("auth.name")), { target: { value: "Karim" } });
    fireEvent.change(screen.getByLabelText(i18n.t("auth.email")), { target: { value: "karim@example.com" } });
    fireEvent.change(screen.getByLabelText(i18n.t("auth.password")), { target: { value: "password1234" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: i18n.t("auth.create_account") }));

    expect(await screen.findByText("verify-email-page")).toBeInTheDocument();
    expect(capturedBody).toMatchObject({
      name: "Karim",
      email: "karim@example.com",
      password: "password1234",
      consent: true,
    });
  });

  it("shows password strength hint based on length", async () => {
    await i18n.changeLanguage("en");
    renderAt("/register", routes);

    const pwInput = await screen.findByLabelText("Password");
    fireEvent.change(pwInput, { target: { value: "short" } });
    expect(screen.getByText(/Use at least 10 characters/i)).toBeInTheDocument();

    fireEvent.change(pwInput, { target: { value: "sufficientlength123" } });
    expect(screen.getByText(/Password length looks good/i)).toBeInTheDocument();
  });
});

// --- S05 Verify Email ------------------------------------------------------
describe("VerifyEmail (S05)", () => {
  const routes = [
    { path: "/verify-email", element: <VerifyEmail /> },
    { path: "/login", element: <p>login-page</p> },
  ];

  it("verifies token and redirects to login with verified notice", async () => {
    let verifiedToken: string | null = null;
    mockFetch({
      "POST /api/v1/auth/verify-email": async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        verifiedToken = body.token;
        return new Response(null, { status: 204 });
      },
    });

    renderAt("/verify-email?token=valid-token-123", routes);
    expect(await screen.findByText(i18n.t("auth.email_confirmed"))).toBeInTheDocument();
    expect(verifiedToken).toBe("valid-token-123");
    await waitFor(() => expect(screen.getByText("login-page")).toBeInTheDocument(), {
      timeout: 2500,
    });
  });

  it("shows expired state when token is invalid (410) and supports resending", async () => {
    let resentEmail: string | null = null;
    mockFetch({
      "POST /api/v1/auth/verify-email": () => json(410, envelope("token_invalid", "errors.token_invalid")),
      "POST /api/v1/auth/resend-verification": async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        resentEmail = body.email;
        return json(202, { ok: true });
      },
    });

    renderAt("/verify-email?token=bad-token&email=testuser@example.com", routes);
    expect(await screen.findByText(i18n.t("auth.verify_expired"))).toBeInTheDocument();

    // Check masked email
    const masked = screen.getByTestId("masked-email");
    expect(masked).toHaveTextContent("te••••••@example.com");

    // Click resend
    const resendBtn = screen.getByRole("button", { name: i18n.t("auth.resend_verification") });
    fireEvent.click(resendBtn);

    await waitFor(() => expect(resentEmail).toBe("testuser@example.com"));
  });
});

// --- S06 Forgot Password ---------------------------------------------------
describe("ForgotPassword (S06)", () => {
  const routes = [
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/login", element: <p>login-page</p> },
  ];

  it.each(["bn", "en"])("sends reset link and shows identical notice in %s", async (lang) => {
    await i18n.changeLanguage(lang);
    let capturedEmail = "";
    mockFetch({
      "POST /api/v1/auth/forgot-password": async (_url, init) => {
        capturedEmail = JSON.parse(init?.body as string).email;
        return json(202, { ok: true });
      },
    });

    renderAt("/forgot-password", routes);
    fireEvent.change(await screen.findByLabelText(i18n.t("auth.email")), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: i18n.t("auth.send_reset_link") }));

    expect(await screen.findByText(i18n.t("auth.forgot_sent"))).toBeInTheDocument();
    expect(capturedEmail).toBe("user@example.com");
  });
});

// --- S07 Reset Password ---------------------------------------------------
describe("ResetPassword (S07)", () => {
  const routes = [
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/login", element: <p>login-page</p> },
    { path: "/forgot-password", element: <p>forgot-page</p> },
  ];

  it("checks password mismatch", async () => {
    await i18n.changeLanguage("en");
    renderAt("/reset-password?token=valid-tok", routes);

    fireEvent.change(await screen.findByLabelText("New password"), { target: { value: "pass1234567" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });

  it("resets password successfully and redirects to login with reset flag", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    mockFetch({
      "POST /api/v1/auth/reset-password": async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return new Response(null, { status: 204 });
      },
    });

    renderAt("/reset-password?token=my-reset-tok", routes);
    fireEvent.change(await screen.findByLabelText(i18n.t("auth.new_password")), { target: { value: "new-super-pass" } });
    fireEvent.change(screen.getByLabelText(i18n.t("auth.confirm_password")), { target: { value: "new-super-pass" } });
    fireEvent.click(screen.getByRole("button", { name: i18n.t("auth.set_new_password") }));

    expect(await screen.findByText("login-page")).toBeInTheDocument();
    expect(capturedBody).toEqual({ token: "my-reset-tok", password: "new-super-pass" });
  });

  it("shows expired message and link to request new link on 410", async () => {
    mockFetch({
      "POST /api/v1/auth/reset-password": () => json(410, envelope("token_invalid", "errors.token_invalid")),
    });

    renderAt("/reset-password?token=expired-tok", routes);
    fireEvent.change(await screen.findByLabelText(i18n.t("auth.new_password")), { target: { value: "new-super-pass" } });
    fireEvent.change(screen.getByLabelText(i18n.t("auth.confirm_password")), { target: { value: "new-super-pass" } });
    fireEvent.click(screen.getByRole("button", { name: i18n.t("auth.set_new_password") }));

    expect(await screen.findByText(i18n.t("auth.reset_expired"))).toBeInTheDocument();
  });
});

// --- AcceptInvite ----------------------------------------------------------
describe("AcceptInvite", () => {
  const routes = [
    { path: "/accept-invite", element: <AcceptInvite /> },
    { path: "/login", element: <p>login-page</p> },
  ];

  it("sets up reviewer account and redirects to login", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    mockFetch({
      "POST /api/v1/auth/accept-invite": async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return new Response(null, { status: 204 });
      },
    });

    renderAt("/accept-invite?token=invite-123", routes);
    fireEvent.change(await screen.findByLabelText(i18n.t("auth.name")), { target: { value: "Inspector" } });
    fireEvent.change(screen.getByLabelText(i18n.t("auth.new_password")), { target: { value: "reviewer-pass" } });
    fireEvent.change(screen.getByLabelText(i18n.t("auth.confirm_password")), { target: { value: "reviewer-pass" } });
    fireEvent.click(screen.getByRole("button", { name: i18n.t("invite.submit") }));

    expect(await screen.findByText("login-page")).toBeInTheDocument();
    expect(capturedBody).toEqual({ token: "invite-123", name: "Inspector", password: "reviewer-pass" });
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
  it("walks through all 3 steps and completes onboarding", async () => {
    let patchedBody: Record<string, unknown> | null = null;
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, { ...baseUser, onboarding_completed: false }),
      "PATCH /api/v1/me": async (_url, init) => {
        patchedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return json(200, { ...baseUser, onboarding_completed: true });
      },
    });

    renderAt("/onboarding", [
      { path: "/onboarding", element: <Onboarding /> },
      { path: "/check", element: <p>check-home</p> },
    ]);

    // Step 1: Language
    expect(await screen.findByText(i18n.t("onboarding.lang_title"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: i18n.t("onboarding.next") }));

    // Step 2: Howto
    expect(await screen.findByText(i18n.t("onboarding.howto_title"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: i18n.t("onboarding.next") }));

    // Step 3: Promises
    expect(await screen.findByText(i18n.t("onboarding.promises_title"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: i18n.t("onboarding.understand_start") }));

    expect(await screen.findByText("check-home")).toBeInTheDocument();
    expect(patchedBody).toMatchObject({ onboarding_completed: true });
  });

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
  it("updates profile name via PATCH /me", async () => {
    let patchedBody: Record<string, unknown> | null = null;
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, baseUser),
      "PATCH /api/v1/me": async (_url, init) => {
        patchedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return json(200, { ...baseUser, display_name: patchedBody.name as string });
      },
    });

    renderAt("/settings", [{ path: "/settings", element: <Settings /> }]);
    const nameInput = await screen.findByLabelText(i18n.t("auth.name"));
    fireEvent.change(nameInput, { target: { value: "New Rahim" } });
    fireEvent.click(screen.getByRole("button", { name: i18n.t("settings.save") }));

    expect(await screen.findByText(i18n.t("settings.saved"))).toBeInTheDocument();
    expect(patchedBody).toEqual({ name: "New Rahim" });
  });

  it("requires exact DELETE confirmation to delete account", async () => {
    let deleteCalled = false;
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, baseUser),
      "DELETE /api/v1/me": async () => {
        deleteCalled = true;
        return new Response(null, { status: 204 });
      },
    });

    renderAt("/settings", [
      { path: "/settings", element: <Settings /> },
      { path: "/", element: <p>landing-home</p> },
    ]);

    fireEvent.click(await screen.findByRole("tab", { name: i18n.t("settings.tab_data") }));
    const deleteBtn = screen.getByRole("button", { name: i18n.t("settings.delete_button") });
    expect(deleteBtn).toBeDisabled();

    const confirmInput = screen.getByLabelText(i18n.t("settings.delete_confirm_label"));
    fireEvent.change(confirmInput, { target: { value: "del" } });
    expect(deleteBtn).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(deleteBtn).not.toBeDisabled();

    fireEvent.click(deleteBtn);
    expect(await screen.findByText("landing-home")).toBeInTheDocument();
    expect(deleteCalled).toBe(true);
  });

  it("revokes a session in the security tab", async () => {
    let revokedSessionId: string | null = null;
    mockFetch({
      "GET /api/v1/auth/session": () => json(200, baseUser),
      "GET /api/v1/me/sessions": () =>
        json(200, [
          { id: "s1", user_agent: "Chrome on Mac", last_seen_at: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z", current: true },
          { id: "s2", user_agent: "Firefox on Linux", last_seen_at: "2026-11-01T09:00:00Z", created_at: "2026-11-01T09:00:00Z", current: false },
        ]),
      "DELETE /api/v1/me/sessions?id=s2": async () => {
        revokedSessionId = "s2";
        return new Response(null, { status: 204 });
      },
    });

    renderAt("/settings", [{ path: "/settings", element: <Settings /> }]);
    fireEvent.click(await screen.findByRole("tab", { name: i18n.t("settings.tab_security") }));

    expect(await screen.findByText("Chrome on Mac")).toBeInTheDocument();
    expect(screen.getByText("Firefox on Linux")).toBeInTheDocument();

    const revokeBtn = screen.getByRole("button", { name: i18n.t("settings.revoke") });
    fireEvent.click(revokeBtn);

    await waitFor(() => expect(revokedSessionId).toBe("s2"));
  });

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

  it("renders for guests and allows preference customization", async () => {
    mockFetch({ "GET /api/v1/auth/session": () => json(200, null) });
    renderAt("/settings", [{ path: "/settings", element: <Settings /> }]);
    
    // Profile tab shows guest notice
    expect(await screen.findByText(/অ্যাকাউন্ট সেটিংসের জন্য সাইন ইন করুন/i)).toBeInTheDocument();

    // Preferences tab is fully interactive for guests
    fireEvent.click(screen.getByRole("tab", { name: "পছন্দ" }));
    const readAloudCheckbox = screen.getByLabelText("ফলাফল সবসময় পড়ে শোনান") as HTMLInputElement;
    expect(readAloudCheckbox).toBeInTheDocument();
    fireEvent.click(readAloudCheckbox);
    expect(readAloudCheckbox.checked).toBe(true);
  });
});
