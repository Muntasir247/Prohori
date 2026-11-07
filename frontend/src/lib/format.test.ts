import { describe, expect, it } from "vitest";

import { formatAmount, toLocaleDigits } from "./format";

describe("toLocaleDigits", () => {
  it("converts ASCII digits to Bengali numerals for bn", () => {
    expect(toLocaleDigits("2026", "bn")).toBe("২০২৬");
    expect(toLocaleDigits(500, "bn")).toBe("৫০০");
  });

  it("leaves digits unchanged for en", () => {
    expect(toLocaleDigits("2026", "en")).toBe("2026");
  });
});

describe("formatAmount", () => {
  it("groups lakhs and uses Bengali numerals for bn", () => {
    // 150000 -> ১,৫০,০০০ (Indian/Bangla lakh grouping, Bengali digits).
    expect(formatAmount(150000, "bn")).toBe("১,৫০,০০০");
  });

  it("groups lakhs with ASCII digits for en", () => {
    expect(formatAmount(150000, "en")).toBe("1,50,000");
  });
});
