import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// In Node 22+ with jsdom, jsdom provides its own AbortSignal which causes
// Node's native undici Request constructor to reject it with
// "Expected signal to be an instance of AbortSignal".
const OriginalRequest = globalThis.Request;
if (OriginalRequest) {
  class PatchedRequest extends OriginalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init && "signal" in init) {
        try {
          super(input, init);
          return;
        } catch {
          const rest = { ...init };
          delete rest.signal;
          super(input, rest);
          return;
        }
      }
      super(input, init);
    }
  }
  globalThis.Request = PatchedRequest as unknown as typeof Request;
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
    React.createElement("span", { "data-icon": icon, ...props }),
}));


