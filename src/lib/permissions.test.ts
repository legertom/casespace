import { describe, expect, it } from "vitest";
import {
  canCreateUseCase,
  canEditUseCase,
  canQualify,
  canViewPulse,
} from "./permissions";

const uc = {
  createdById: "creator",
  ownerUserId: "owner",
  authorUserIds: ["author-1", "author-2"],
};

describe("use case editing", () => {
  it("admins edit everything", () => {
    expect(canEditUseCase({ id: "someone", role: "admin" }, uc)).toBe(true);
  });

  it("contributors edit records they created, own, or authored", () => {
    expect(canEditUseCase({ id: "creator", role: "contributor" }, uc)).toBe(true);
    expect(canEditUseCase({ id: "owner", role: "contributor" }, uc)).toBe(true);
    expect(canEditUseCase({ id: "author-2", role: "contributor" }, uc)).toBe(
      true,
    );
  });

  it("an AI Lead cannot edit someone else's record", () => {
    expect(canEditUseCase({ id: "stranger", role: "contributor" }, uc)).toBe(
      false,
    );
  });

  it("viewers are read-only even on records naming them", () => {
    expect(canEditUseCase({ id: "owner", role: "viewer" }, uc)).toBe(false);
  });
});

describe("role gates", () => {
  it("only contributors and admins create", () => {
    expect(canCreateUseCase("viewer")).toBe(false);
    expect(canCreateUseCase("contributor")).toBe(true);
    expect(canCreateUseCase("admin")).toBe(true);
  });

  it("only admins qualify", () => {
    expect(canQualify("contributor")).toBe(false);
    expect(canQualify("admin")).toBe(true);
  });

  it("pulse charts are admin-only", () => {
    expect(canViewPulse("viewer")).toBe(false);
    expect(canViewPulse("contributor")).toBe(false);
    expect(canViewPulse("admin")).toBe(true);
  });
});
