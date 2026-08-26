import { describe, expect, it } from "vitest";
import { AUDITED_FIELDS } from "./domain";
import { describeFieldChange } from "./field-audit";

describe("field-change sentences", () => {
  it("says what membership means, both directions", () => {
    expect(describeFieldChange("in_program", "false", "true")).toBe(
      "Added to the program — counts toward the 45 and the 15",
    );
    expect(describeFieldChange("in_program", "true", "false")).toBe(
      "Removed from the program — no longer counted",
    );
  });

  it("handles owner set, changed, and cleared", () => {
    expect(describeFieldChange("owner", null, "Wendy Yu")).toBe(
      "Owner set to Wendy Yu",
    );
    expect(describeFieldChange("owner", "Wendy Yu", "Kenton Lu")).toBe(
      "Owner: Wendy Yu → Kenton Lu",
    );
    expect(describeFieldChange("owner", "Wendy Yu", null)).toBe(
      "Owner cleared (was Wendy Yu)",
    );
  });

  it("handles credit and ELT allocation the same three ways", () => {
    expect(describeFieldChange("authors", "Ada", "Ada, Grace")).toBe(
      "Credit: Ada → Ada, Grace",
    );
    expect(describeFieldChange("elt_org", null, "Product & Eng")).toBe(
      "Allocated to Product & Eng's ELT share",
    );
  });

  it("names the gate that moved", () => {
    expect(describeFieldChange("gate_owner", "false", "true")).toBe(
      "Gate met: A named owner",
    );
    expect(describeFieldChange("gate_tool", "true", "false")).toBe(
      "Gate unmet: AI tool & approach identified",
    );
  });

  it("has a sentence for every audited field", () => {
    for (const field of AUDITED_FIELDS) {
      expect(describeFieldChange(field, "a", "b")).toBeTruthy();
    }
  });
});
