import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, urlDisplayLabel } from "./use-case-urls";

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://example.com/x?y=z#w")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("accepts a URL padded with whitespace", () => {
    expect(isSafeHttpUrl("  https://example.com  ")).toBe(true);
  });

  // These render as anchors, so every one of these is an XSS vector.
  it.each([
    ["javascript:alert(1)", "the obvious one"],
    ["JaVaScRiPt:alert(1)", "scheme casing is not a defense"],
    [" javascript:alert(1)", "leading space, which URL parsing trims"],
    [
      "javascript://example.com/%0aalert(1)",
      "a valid-looking host after the scheme",
    ],
    ["data:text/html;base64,PHNjcmlwdD4=", "data documents"],
    ["vbscript:msgbox(1)", "the forgotten sibling"],
  ])("rejects %s — %s", (raw) => {
    expect(isSafeHttpUrl(raw)).toBe(false);
  });

  it("rejects a protocol-relative URL, which is not a URL on its own", () => {
    expect(isSafeHttpUrl("//evil.com")).toBe(false);
  });

  it("rejects text that is not a URL at all", () => {
    expect(isSafeHttpUrl("not a url")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });
});

describe("urlDisplayLabel", () => {
  it("prefers the free label", () => {
    expect(
      urlDisplayLabel({ kind: "other", label: "Runbook", url: "https://a.com" }),
    ).toBe("Runbook");
  });

  it("falls back to the kind when the label is missing or blank", () => {
    expect(urlDisplayLabel({ kind: "github", url: "https://a.com" })).toBe(
      "GitHub",
    );
    expect(
      urlDisplayLabel({ kind: "live", label: "   ", url: "https://a.com" }),
    ).toBe("Live");
  });
});
