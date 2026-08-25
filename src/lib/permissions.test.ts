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
  visibleHistoryNote,
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

describe("history-note redaction", () => {
  const roiNote = {
    toStatus: "confirmed_positive_roi",
    note: "Annual ROI ~$120k in saved CSS hours",
  } as const;
  const rejectionNote = {
    toStatus: "launched",
    note: "Rejected at the Qualified gate: adoption evidence is one team",
  } as const;

  it("admins see the confirmed-ROI note", () => {
    expect(visibleHistoryNote(roiNote, "admin")).toBe(roiNote.note);
  });

  it("viewers and contributors never see the confirmed-ROI note", () => {
    expect(visibleHistoryNote(roiNote, "viewer")).toBeNull();
    expect(visibleHistoryNote(roiNote, "contributor")).toBeNull();
  });

  it("every role still sees other transition notes", () => {
    expect(visibleHistoryNote(rejectionNote, "viewer")).toBe(rejectionNote.note);
    expect(visibleHistoryNote(rejectionNote, "contributor")).toBe(
      rejectionNote.note,
    );
    expect(visibleHistoryNote(rejectionNote, "admin")).toBe(rejectionNote.note);
  });

  it("a noteless entry stays noteless for everyone", () => {
    const bare = { toStatus: "confirmed_positive_roi", note: null } as const;
    expect(visibleHistoryNote(bare, "admin")).toBeNull();
    expect(visibleHistoryNote(bare, "viewer")).toBeNull();
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

describe("employees", () => {
  it("log use cases", () => {
    expect(canCreateUseCase("employee")).toBe(true);
  });

  it("edit records they created, own, or authored — and no others", () => {
    expect(canEditUseCase({ id: "creator", role: "employee" }, uc)).toBe(true);
    expect(canEditUseCase({ id: "owner", role: "employee" }, uc)).toBe(true);
    expect(canEditUseCase({ id: "author-1", role: "employee" }, uc)).toBe(true);
    expect(canEditUseCase({ id: "stranger", role: "employee" }, uc)).toBe(false);
  });

  it("cannot link workflows — the one place they are narrower than an AI Lead", () => {
    expect(canLinkUseCases("employee")).toBe(false);
    expect(canLinkUseCases("contributor")).toBe(true);
  });

  it("can still unlink from a record they can edit", () => {
    expect(
      canUnlinkUseCases({ id: "creator", role: "employee" }, { createdById: "someone" }, [uc]),
    ).toBe(true);
  });

  it("comment, like everyone", () => {
    expect(canComment("employee")).toBe(true);
  });

  it("see none of the three admin-only reads", () => {
    expect(canViewPulse("employee")).toBe(false);
    expect(canViewCoachLearnings("employee")).toBe(false);
    expect(canQualify("employee")).toBe(false);
  });

  it("do not see annual-ROI notes", () => {
    expect(
      visibleHistoryNote(
        { toStatus: "confirmed_positive_roi", note: "saves 400 hours" },
        "employee",
      ),
    ).toBeNull();
  });
});

describe("viewers stay out of the casebook's write surface", () => {
  it("is the only role that cannot create", () => {
    expect(canCreateUseCase("viewer")).toBe(false);
    expect(canCreateUseCase("employee")).toBe(true);
    expect(canCreateUseCase("contributor")).toBe(true);
    expect(canCreateUseCase("admin")).toBe(true);
  });
});
