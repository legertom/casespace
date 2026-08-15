import { describe, expect, it } from "vitest";
import {
  canComment,
  canCreateUseCase,
  canEditUseCase,
  canLinkUseCases,
  canQualify,
  canUnlinkUseCases,
  canViewCoachLearnings,
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

  it("coach learnings are admin-only", () => {
    expect(canViewCoachLearnings("viewer")).toBe(false);
    expect(canViewCoachLearnings("contributor")).toBe(false);
    expect(canViewCoachLearnings("admin")).toBe(true);
  });

  it("every role comments — viewers included, on purpose", () => {
    expect(canComment("viewer")).toBe(true);
    expect(canComment("contributor")).toBe(true);
    expect(canComment("admin")).toBe(true);
  });

  it("every AI lead links workflows, viewers don't", () => {
    expect(canLinkUseCases("viewer")).toBe(false);
    expect(canLinkUseCases("contributor")).toBe(true);
    expect(canLinkUseCases("admin")).toBe(true);
  });
});

describe("linking workflows", () => {
  const link = { createdById: "linker" };
  const other = {
    createdById: "other-creator",
    ownerUserId: "other-owner",
    authorUserIds: [],
  };

  it("a lead can link records they had no hand in", () => {
    expect(canLinkUseCases("contributor")).toBe(true);
  });

  it("whoever made the link can remove it", () => {
    expect(
      canUnlinkUseCases({ id: "linker", role: "contributor" }, link, [uc, other]),
    ).toBe(true);
  });

  it("someone on either record can remove a link they didn't make", () => {
    expect(
      canUnlinkUseCases({ id: "owner", role: "contributor" }, link, [uc, other]),
    ).toBe(true);
    expect(
      canUnlinkUseCases({ id: "other-owner", role: "contributor" }, link, [
        uc,
        other,
      ]),
    ).toBe(true);
  });

  it("admins remove any link", () => {
    expect(canUnlinkUseCases({ id: "stranger", role: "admin" }, link, [])).toBe(
      true,
    );
  });

  it("a bystander can't remove someone else's link", () => {
    expect(
      canUnlinkUseCases({ id: "stranger", role: "contributor" }, link, [
        uc,
        other,
      ]),
    ).toBe(false);
  });
});
