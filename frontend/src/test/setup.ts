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
          const { signal: _signal, ...rest } = init;
          super(input, rest);
          return;
        }
      }
      super(input, init);
    }
  }
  // @ts-ignore Patching global Request for jsdom compatibility
  globalThis.Request = PatchedRequest as unknown as typeof Request;
}

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
    React.createElement("span", { "data-icon": icon, ...props }),
}));


