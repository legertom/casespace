import { describe, expect, it } from "vitest";
import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts a uuid in either case", () => {
    expect(isUuid("156685d6-4dc6-4282-88c0-c592c24be240")).toBe(true);
    expect(isUuid("156685D6-4DC6-4282-88C0-C592C24BE240")).toBe(true);
  });

  it("rejects what a URL can actually carry", () => {
    for (const bad of [
      "",
      "me",
      "not-a-uuid",
      "156685d6-4dc6-4282-88c0-c592c24be24", // one short
      "156685d6-4dc6-4282-88c0-c592c24be2400", // one long
      "156685d6_4dc6_4282_88c0_c592c24be240", // underscores
      "156685d6-4dc6-4282-88c0-c592c24be24g", // not hex
      " 156685d6-4dc6-4282-88c0-c592c24be240", // padded
    ]) {
      expect(isUuid(bad), bad).toBe(false);
    }
  });

  it("is not fooled by a newline, which /.$/ would allow", () => {
    expect(isUuid("156685d6-4dc6-4282-88c0-c592c24be240\n")).toBe(false);
  });
});
