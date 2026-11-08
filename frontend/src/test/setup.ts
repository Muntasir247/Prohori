import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
    React.createElement("span", { "data-icon": icon, ...props }),
}));

