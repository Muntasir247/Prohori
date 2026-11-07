import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import i18n from "@/lib/i18n";

import Login from "./Login";

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(async () => {
  await i18n.changeLanguage("bn");
});

describe("Login screen", () => {
  it("renders the Bangla sign-in title by default", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "সাইন ইন" })).toBeInTheDocument();
    // Account-discovery-safe copy: the password field exists and can be revealed.
    expect(screen.getByLabelText("পাসওয়ার্ড দেখান")).toBeInTheDocument();
  });

  it("renders in English after switching language", async () => {
    await i18n.changeLanguage("en");
    renderLogin();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.getByText("Check without an account"),
    ).toBeInTheDocument();
  });
});
